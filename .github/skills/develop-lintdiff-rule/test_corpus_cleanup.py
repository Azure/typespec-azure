import contextlib
import io
import json
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import corpus_cleanup as cleanup


class CorpusCleanupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "-q")
        self.git("config", "user.name", "Cleanup test")
        self.git("config", "user.email", "cleanup@example.invalid")
        self.git("config", "core.autocrlf", "false")
        self.scope = self.repo / cleanup.SCOPE
        self.scope.mkdir(parents=True)
        self.write("_meta.json", b'{"baseline":true}\r\n')
        self.write("typespec-results.json", b"baseline\n")
        self.write("projects/example/typespec/main.tsp", b"model Unchanged {}\n")
        self.git("add", ".")
        self.git("commit", "-qm", "baseline")
        self.before = self.root / "before"
        self.plan_dir = self.root / "plan"

    def git(self, *args):
        return subprocess.run(
            ["git", "-C", str(self.repo), *args],
            check=True, capture_output=True,
        ).stdout

    def write(self, name, data):
        path = self.scope / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path

    def capture(self):
        return cleanup.capture(cleanup.repository(self.repo), self.before)

    def plan(self):
        return cleanup.plan(self.repo, self.before, self.plan_dir)

    def test_restores_bytes_deletions_and_other_rule_shards(self):
        self.capture()
        (self.scope / "typespec-results.json").unlink()
        self.write("_meta.json", b"changed\n")
        self.write("results/by-typespec-rule/another-rule.json", b"new shard")
        self.write("projects/example/raw/typespec.projected-http-graph.json", b"graph")
        self.write("projects/example/raw/typespec.stdout.txt", b"stdout")
        plan = self.plan()
        self.assertEqual(5, len(plan["changes"]))
        result = cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual("restored", result["status"])
        self.assertEqual(b'{"baseline":true}\r\n', (self.scope / "_meta.json").read_bytes())
        self.assertEqual(b"baseline\n", (self.scope / "typespec-results.json").read_bytes())
        self.assertFalse((self.scope / "results/by-typespec-rule/another-rule.json").exists())
        self.assertEqual(b"", self.git("status", "--porcelain"))
        self.assertTrue((self.plan_dir / "objects" / cleanup.digest(b"new shard")).is_file())

    def test_restores_deleted_legacy_projected_enum_output(self):
        output = self.write(
            "projects/example/raw/typespec.projected-enum.json",
            b'{"legacy":true}\n',
        )
        self.git("add", ".")
        self.git("commit", "-qm", "legacy projected enum baseline")
        self.capture()
        output.unlink()
        plan = self.plan()
        self.assertEqual(1, len(plan["changes"]))
        change = plan["changes"][0]
        self.assertEqual(
            "projects/example/raw/typespec.projected-enum.json",
            change["path"],
        )
        self.assertEqual(cleanup.digest(b'{"legacy":true}\n'), change["before"]["sha256"])
        self.assertIsNone(change["after"])
        self.assertEqual("restore", change["action"])
        cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual(b'{"legacy":true}\n', output.read_bytes())
        self.assertEqual(b"", self.git("status", "--porcelain"))

    def test_preserves_preexisting_untracked_files_and_rule_edits(self):
        self.write("notes.txt", b"untracked evidence")
        self.write("results/by-typespec-rule/preexisting.json", b"preexisting output")
        rule = self.repo / "rule.ts"
        rule.write_bytes(b"task draft")
        self.capture()
        self.write("results/by-typespec-rule/preexisting.json", b"regenerated")
        plan = self.plan()
        cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual(b"untracked evidence", (self.scope / "notes.txt").read_bytes())
        self.assertEqual(b"preexisting output", (self.scope / "results/by-typespec-rule/preexisting.json").read_bytes())
        self.assertEqual(b"task draft", rule.read_bytes())

    def test_dirty_baseline_blocks_before_capture(self):
        self.write("_meta.json", b"user changes")
        with self.assertRaisesRegex(ValueError, "predate"):
            self.capture()
        self.assertFalse(self.before.exists())

    def test_unexpected_new_or_modified_input_blocks_all_cleanup(self):
        for name in ("unexpected.json", "projects/example/typespec/main.tsp"):
            with self.subTest(name=name):
                if not self.before.exists():
                    self.capture()
                self.write(name, b"not a generated output")
                self.write("_meta.json", b"generated")
                with self.assertRaisesRegex(ValueError, "Non-output"):
                    self.plan()
                self.assertEqual(b"generated", (self.scope / "_meta.json").read_bytes())
                self.assertFalse(self.plan_dir.exists())
                if name == "unexpected.json":
                    (self.scope / name).unlink()

    def test_stale_approval_or_new_files_prevent_mutation(self):
        self.capture()
        self.write("_meta.json", b"generated")
        plan = self.plan()
        self.write("results/by-typespec-rule/late.json", b"late writer")
        with self.assertRaisesRegex(ValueError, "stale"):
            cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual(b"generated", (self.scope / "_meta.json").read_bytes())

    def test_modified_output_after_plan_prevents_mutation(self):
        self.capture()
        self.write("_meta.json", b"generated")
        plan = self.plan()
        self.write("_meta.json", b"concurrent changes")
        with self.assertRaisesRegex(ValueError, "stale"):
            cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual(b"concurrent changes", (self.scope / "_meta.json").read_bytes())

    def test_deleted_input_is_not_a_cleanup_target(self):
        self.capture()
        (self.scope / "projects/example/typespec/main.tsp").unlink()
        with self.assertRaisesRegex(ValueError, "Non-output"):
            self.plan()

    def test_ignored_generated_output_is_inventoried(self):
        (self.repo / ".gitignore").write_text("*.stdout.txt\n")
        self.capture()
        output = self.write("projects/example/raw/typespec.stdout.txt", b"ignored")
        plan = self.plan()
        self.assertEqual(1, len(plan["changes"]))
        cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertFalse(output.exists())

    def test_head_or_index_change_blocks(self):
        self.capture()
        self.write("_meta.json", b"generated")
        self.git("add", str(cleanup.SCOPE / "_meta.json"))
        with self.assertRaisesRegex(ValueError, "index"):
            self.plan()
        self.git("commit", "-qm", "external change")
        with self.assertRaisesRegex(ValueError, "HEAD"):
            self.plan()

    def test_digest_and_archive_integrity_checked_before_mutation(self):
        self.capture()
        self.write("_meta.json", b"generated")
        plan = self.plan()
        with self.assertRaisesRegex(ValueError, "approved"):
            cleanup.apply(self.repo, self.plan_dir, "not-the-approved-hash")
        baseline = cleanup.load(self.before / "snapshot.json")
        sha = baseline["files"]["_meta.json"]["sha256"]
        (self.before / "objects" / sha).write_bytes(b"corrupt")
        with self.assertRaisesRegex(ValueError, "Corrupt baseline"):
            cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual(b"generated", (self.scope / "_meta.json").read_bytes())

    def test_evidence_must_be_new_and_outside_repo(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            cleanup.capture(self.repo, self.repo / "evidence")
        self.capture()
        with self.assertRaises(FileExistsError):
            self.capture()

    def test_capture_detects_concurrent_writer(self):
        inventory = cleanup.inventory
        calls = 0

        def changing_inventory(*args):
            nonlocal calls
            calls += 1
            result = inventory(*args)
            if calls == 1:
                self.write("_meta.json", b"concurrent writer")
            return result

        with patch.object(cleanup, "inventory", side_effect=changing_inventory):
            with self.assertRaisesRegex(ValueError, "during capture"):
                self.capture()
        self.assertFalse((self.before / "snapshot.json").exists())

    def test_changed_run_archive_blocks_before_restore(self):
        self.capture()
        self.write("_meta.json", b"generated")
        plan = self.plan()
        (self.plan_dir / "objects" / cleanup.digest(b"generated")).write_bytes(b"corrupt")
        with self.assertRaisesRegex(ValueError, "Corrupt run"):
            cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual(b"generated", (self.scope / "_meta.json").read_bytes())

    def test_tampered_baseline_blocks_before_restore(self):
        self.capture()
        self.write("_meta.json", b"generated")
        plan = self.plan()
        path = self.before / "snapshot.json"
        path.write_bytes(path.read_bytes() + b" ")
        with self.assertRaisesRegex(ValueError, "snapshot changed"):
            cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertFalse((self.plan_dir / "apply.jsonl").exists())

    def test_omitted_plan_path_is_rejected_even_with_matching_digest(self):
        self.capture()
        self.write("_meta.json", b"generated")
        self.plan()
        path = self.plan_dir / "plan.json"
        plan = cleanup.load(path)
        plan["changes"] = []
        path.write_text(json.dumps(plan))
        with self.assertRaisesRegex(ValueError, "omits"):
            cleanup.apply(self.repo, self.plan_dir, cleanup.digest(path.read_bytes()))

    def test_partial_io_failure_records_actions_and_cannot_replay(self):
        self.capture()
        self.write("_meta.json", b"generated")
        self.write("typespec-results.json", b"generated results")
        plan = self.plan()
        write_bytes = Path.write_bytes

        def fail_second(path, content):
            if path == self.scope / "typespec-results.json":
                raise OSError("simulated disk failure")
            return write_bytes(path, content)

        with patch.object(Path, "write_bytes", fail_second):
            with self.assertRaisesRegex(OSError, "simulated"):
                cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        lines = (self.plan_dir / "apply.jsonl").read_text().splitlines()
        self.assertEqual(["started", "applied"], [json.loads(line)["status"] for line in lines])
        with self.assertRaisesRegex(ValueError, "stale"):
            cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        self.assertEqual(b"generated results", (self.scope / "typespec-results.json").read_bytes())

    def test_rejects_links(self):
        target = self.scope / "_meta.json"
        target.unlink()
        external = self.root / "external"
        external.write_bytes(b"external")
        try:
            target.symlink_to(external)
        except OSError as error:
            if getattr(error, "winerror", None) != 1314:
                raise
            # Windows without symlink privilege: exercise reparse detection directly.
            fake = type("Info", (), {"st_file_attributes": 0x400, "st_mode": stat.S_IFREG})()
            with patch.object(Path, "lstat", return_value=fake):
                with self.assertRaisesRegex(ValueError, "reparse"):
                    cleanup.no_link(target)
        else:
            with self.assertRaisesRegex(ValueError, "reparse"):
                cleanup.inventory(self.repo)
        self.assertEqual(b"external", external.read_bytes())

    def test_rejects_unsafe_manifest_paths(self):
        for name in ("../_meta.json", "/_meta.json", "C:/_meta.json",
                     "results\\by-typespec-rule\\x.json", "projects/x/raw/../_meta.json"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                cleanup.safe_name(name)

    def test_rejects_hard_links(self):
        linked = self.scope / "linked.json"
        linked.hardlink_to(self.scope / "_meta.json")
        with self.assertRaisesRegex(ValueError, "unlinked"):
            self.capture()

    def test_failure_is_explicit_on_cli(self):
        args = ["corpus_cleanup.py", "--repo", str(self.repo),
                "capture", "--output", str(self.before)]
        self.write("_meta.json", b"dirty")
        output = io.StringIO()
        with patch("sys.argv", args), contextlib.redirect_stderr(output):
            self.assertEqual(1, cleanup.main())
        self.assertEqual("failed", json.loads(output.getvalue())["status"])

    def test_walk_error_is_not_a_successful_partial_inventory(self):
        def inaccessible(_root, *, followlinks, onerror):
            onerror(PermissionError("inaccessible corpus directory"))

        with patch.object(cleanup.os, "walk", side_effect=inaccessible):
            with self.assertRaisesRegex(PermissionError, "inaccessible"):
                cleanup.inventory(self.repo)

    def test_cli_roundtrip(self):
        def run(*args):
            output = io.StringIO()
            argv = ["corpus_cleanup.py", "--repo", str(self.repo), *args]
            with patch("sys.argv", argv), contextlib.redirect_stdout(output):
                self.assertEqual(0, cleanup.main())
            return json.loads(output.getvalue())

        self.assertEqual("captured", run("capture", "--output", str(self.before))["status"])
        self.write("results/by-typespec-rule/second-rule.json", b"additional output")
        plan = run(
            "plan", "--snapshot", str(self.before),
            "--output", str(self.plan_dir), "--quiescent",
        )
        result = run(
            "apply", "--plan", str(self.plan_dir),
            "--approve", plan["sha256"], "--quiescent",
        )
        self.assertEqual("restored", result["status"])
        self.assertEqual(b"", self.git("status", "--porcelain"))

    def test_cli_requires_quiescence_attestation(self):
        argv = [
            "corpus_cleanup.py", "--repo", str(self.repo),
            "plan", "--snapshot", str(self.before), "--output", str(self.plan_dir),
        ]
        with patch("sys.argv", argv), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as result:
                cleanup.main()
        self.assertEqual(2, result.exception.code)

    def test_noop_cleanup_is_safe(self):
        self.capture()
        plan = self.plan()
        self.assertEqual([], plan["changes"])
        cleanup.apply(self.repo, self.plan_dir, plan["sha256"])
        with self.assertRaises(FileExistsError):
            cleanup.apply(self.repo, self.plan_dir, plan["sha256"])


if __name__ == "__main__":
    unittest.main()
