"""Offline tests. Scratch data stays inside the skills checkout."""

import copy
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import unittest
from unittest.mock import patch
import uuid

import shared_baseline as shared


class SharedBaselineTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parent / (".shared-baseline-test-" + uuid.uuid4().hex)
        self.root.mkdir()
        self.addCleanup(shutil.rmtree, self.root)
        self.run = self.root / "sealed"
        self.dataset = self.run / "dataset"
        self.dataset.mkdir(parents=True)
        self.commit = "a" * 40
        project = {"sourcePath": "specification/example", "compileStatus": "success",
                   "validationStatus": "success", "typespecFiles": ["source\\main.tsp"],
                   "swaggerFiles": ["swagger.json"], "swaggerAssets": ["swagger.json"],
                   "rawFiles": ["raw.json"], "compileDurationMs": 1}
        self.projects = [project]
        self.write(self.dataset / "source" / "main.tsp", {"source": "original"})
        self.write(self.dataset / "swagger.json", {})
        self.write(self.dataset / "raw.json", {})
        self.write(self.dataset / "results" / "First.json", {
            "schemaVersion": 4, "specsCommit": self.commit, "rule": "First",
            "results": [{"rule": "First", "project": project["sourcePath"],
                         "swaggerFile": "swagger.json", "path": ["definitions", 0]}]})
        self.write(self.dataset / "validator-results.json", {
            "schemaVersion": 4, "specsCommit": self.commit, "totalViolations": 1,
            "rules": {"First": {"count": 1, "resultsFile": "results/First.json"}}})
        self.write(self.dataset / "_meta.json", {
            "schemaVersion": 4, "complete": True, "specsCommit": self.commit,
            "specsRepository": "https://github.com/Azure/azure-rest-api-specs",
            "filters": {"serviceType": "resource-manager"}, "projects": self.projects,
            "commonTypesFiles": [], "resultFiles": ["results/First.json"],
            "summary": {"discoveredProjects": 1, "compiledProjects": 1, "failedProjects": 0,
                        "emittedSwaggerFiles": 1, "validatedProjects": 1,
                        "validationFailures": 0, "violations": 1, "distinctRules": 1}})
        self.baseline = {"schemaVersion": 1, "context": {
            "specsCommit": self.commit,
            "specsRepository": "https://github.com/Azure/azure-rest-api-specs",
            "candidateCommit": "b" * 40, "coreCommit": "c" * 40, "nodeVersion": "v26.5.0",
            "scope": "source"}, "files": [], "projects": self.projects}
        self.manifest = {"schemaVersion": 2, "status": "complete",
                         "assessmentMode": "swagger-baseline", "completionScope": "swagger-only",
                         "nativeAssessment": "not-run", "finishedAt": "2026-10-26T07:05:10.288Z"}
        self.descriptor = {"schemaVersion": 1, "baselineId": "swagger-arm-test",
                           "assessmentMode": "swagger-baseline", "source": {
                               "repository": "Azure/azure-rest-api-specs", "commit": self.commit,
                               "preservationRepository": "msyyc/azure-rest-api-specs",
                               "preservationRef": "evidence/frozen"},
                           "producer": {
                               "candidateRepository": "Azure/typespec-azure",
                               "candidateCommit": "b" * 40, "coreCommit": "c" * 40,
                               "toolingRepository": "Azure/typespec-azure",
                               "toolingCommit": "d" * 40, "nodeVersion": "v26.5.0",
                               "scope": "source", "selection": {
                                   "serviceType": "resource-manager", "filter": None, "limit": None},
                               "observedAt": "2026-10-26T07:05:10.288Z"},
                           "dataset": {"projects": 1, "swaggerFiles": 1, "compileFailures": 0,
                                       "validationFailures": 0, "observations": 1,
                                       "rulesWithFindings": 1},
                           "baselineIdentity": "0" * 64,
                           "archive": {"repository": "msyyc/azure-rest-api-specs",
                                       "release": "swagger-test", "name": "swagger-test.tar.gz",
                                       "sha256": "0" * 64, "bytes": 1}}
        self.descriptor_path = self.root / "descriptor.json"
        self.archive = self.root / "archive.tar.gz"
        self.seal()

    def write(self, path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")

    def seal(self):
        self.baseline["files"] = [{"file": name.replace("/", "\\"), "sha256": checksum}
                                  for name, checksum in sorted(shared.inventory(self.dataset).items())]
        checksum = shared.identity(self.baseline)
        self.manifest["baselineIdentity"] = checksum
        self.descriptor["baselineIdentity"] = checksum
        self.write(self.run / "baseline.json", self.baseline)
        self.write(self.run / "manifest.json", self.manifest)
        self.pack()

    def pack(self, extra=None):
        with tarfile.open(self.archive, "w:gz") as stream:
            for path in sorted(self.run.rglob("*")):
                if path.is_file():
                    stream.add(path, arcname=path.relative_to(self.run).as_posix(), recursive=False)
            if extra:
                member, content = extra
                stream.addfile(member, io.BytesIO(content))
        self.descriptor["archive"]["sha256"] = shared.digest(self.archive)
        self.descriptor["archive"]["bytes"] = self.archive.stat().st_size
        self.write(self.descriptor_path, self.descriptor)

    def fetch(self, name="output"):
        return shared.fetch(self.descriptor_path, self.root / name, self.archive)

    def test_success_local_no_network_and_cross_rule_reuse(self):
        with patch.object(subprocess, "run", side_effect=AssertionError("No network")):
            first = self.fetch("first-rule")
            second = self.fetch("different-rule")
        self.assertEqual(first["baselineIdentity"], second["baselineIdentity"])
        self.assertEqual(first["swaggerGeneration"], "not-run")
        self.assertEqual(first["sourceCommit"], self.commit)
        self.assertTrue((Path(first["baselineRun"]) / "dataset" / "source" / "main.tsp").is_file())
        self.assertTrue(any("\\" in entry["file"] for entry in
                            shared.load_json(Path(first["baselineRun"]) / "baseline.json")["files"]))

    def test_download_uses_explicit_argv_once(self):
        def download(args, check):
            self.assertEqual(args[:5], ["gh", "release", "download", "swagger-test", "--repo"])
            self.assertEqual(args[5:8], ["msyyc/azure-rest-api-specs", "--pattern", "swagger-test.tar.gz"])
            self.assertTrue(check)
            shutil.copyfile(self.archive, Path(args[-1]) / "swagger-test.tar.gz")
        with patch.object(subprocess, "run", side_effect=download) as run:
            shared.fetch(self.descriptor_path, self.root / "downloaded")
        self.assertEqual(run.call_count, 1)

    def test_download_failure_no_retry(self):
        with patch.object(subprocess, "run", side_effect=subprocess.CalledProcessError(1, ["gh"])) as run:
            with self.assertRaises(subprocess.CalledProcessError):
                shared.fetch(self.descriptor_path, self.root / "downloaded")
        self.assertEqual(run.call_count, 1)

    def test_archive_checksum_and_size_before_extraction(self):
        for key, value in (("sha256", "f" * 64), ("bytes", self.archive.stat().st_size + 1)):
            with self.subTest(key=key):
                descriptor = copy.deepcopy(self.descriptor)
                descriptor["archive"][key] = value
                self.write(self.descriptor_path, descriptor)
                with self.assertRaises(ValueError):
                    self.fetch(key)
                self.assertEqual(list((self.root / key).iterdir()), [])

    def test_missing_corrupt_unexpected_dataset_files(self):
        for mode in ("missing", "corrupt", "unexpected"):
            with self.subTest(mode=mode):
                file = self.dataset / "raw.json"
                original = file.read_bytes()
                if mode == "missing":
                    file.unlink()
                elif mode == "corrupt":
                    file.write_bytes(b"bad")
                else:
                    (self.dataset / "extra.json").write_bytes(b"{}")
                self.pack()
                with self.assertRaisesRegex(ValueError, "inventory mismatch"):
                    self.fetch(mode)
                file.write_bytes(original)
                (self.dataset / "extra.json").unlink(missing_ok=True)

    def test_manifest_rejects_scope_native_claims_and_incompletion(self):
        for key, value in (("completionScope", "full"), ("nativeAssessment", "complete"),
                           ("assessmentMode", "native"), ("status", "running"),
                           ("schemaVersion", 1), ("finishedAt", None)):
            with self.subTest(key=key):
                original = self.manifest[key]
                self.manifest[key] = value
                self.seal()
                with self.assertRaises(ValueError):
                    self.fetch(key)
                self.manifest[key] = original

    def test_unsafe_tar_members(self):
        cases = [("../escape", tarfile.REGTYPE), ("/absolute", tarfile.REGTYPE),
                 ("C:\\escape", tarfile.REGTYPE), ("\\\\host\\escape", tarfile.REGTYPE),
                 ("dataset/link", tarfile.SYMTYPE), ("dataset/hard", tarfile.LNKTYPE),
                 ("dataset/fifo", tarfile.FIFOTYPE), ("dataset/raw.json", tarfile.REGTYPE),
                 ("dataset/RAW.json", tarfile.REGTYPE), ("other.json", tarfile.REGTYPE),
                 ("dataset/SOURCE/other.tsp", tarfile.REGTYPE),
                 ("dataset/CON", tarfile.REGTYPE), ("dataset/a:stream", tarfile.REGTYPE)]
        for number, (name, kind) in enumerate(cases):
            with self.subTest(name=name):
                member = tarfile.TarInfo(name)
                member.type = kind
                member.linkname = "../outside"
                member.size = 0
                self.pack((member, b""))
                with self.assertRaises((ValueError, OSError)):
                    self.fetch(f"unsafe-{number}")
        self.assertFalse((self.root / "escape").exists())

    def test_unknown_descriptor_schema_and_existing_destination(self):
        self.descriptor["schemaVersion"] = 99
        self.write(self.descriptor_path, self.descriptor)
        with self.assertRaisesRegex(ValueError, "schema"):
            self.fetch()
        self.descriptor["schemaVersion"] = 1
        self.write(self.descriptor_path, self.descriptor)
        (self.root / "output").mkdir()
        with self.assertRaisesRegex(ValueError, "must not exist"):
            self.fetch()

    def test_source_mismatch(self):
        self.descriptor["source"]["commit"] = "f" * 40
        self.write(self.descriptor_path, self.descriptor)
        with self.assertRaisesRegex(ValueError, "Source commit"):
            self.fetch()

    def test_baseline_schema_and_identity(self):
        self.baseline["schemaVersion"] = 2
        self.seal()
        with self.assertRaisesRegex(ValueError, "baseline schema"):
            self.fetch("schema")
        self.baseline["schemaVersion"] = 1
        self.seal()
        self.write(self.run / "baseline.json", {**self.baseline, "projects": []})
        self.pack()
        with self.assertRaisesRegex(ValueError, "identity"):
            self.fetch("identity")

    def test_missing_shard_is_not_zero_findings(self):
        (self.dataset / "results" / "First.json").unlink()
        self.pack()
        with self.assertRaisesRegex(ValueError, "inventory mismatch"):
            self.fetch()

    def test_descriptor_validation_has_no_owner_or_selection_defaults(self):
        mutations = [
            lambda value: value["archive"].pop("repository"),
            lambda value: value["archive"].update(repository="other/specs"),
            lambda value: value["archive"].update(release="--latest"),
            lambda value: value["archive"].update(name="../archive.tar.gz"),
            lambda value: value["archive"].update(bytes=True),
            lambda value: value["source"].update(commit="main"),
            lambda value: value["producer"]["selection"].update(filter="pilot"),
            lambda value: value["dataset"].update(validationFailures=1),
            lambda value: value.update(validatorRule="First"),
        ]
        for number, mutate in enumerate(mutations):
            with self.subTest(number=number):
                value = copy.deepcopy(self.descriptor)
                mutate(value)
                self.write(self.descriptor_path, value)
                with patch.object(subprocess, "run", side_effect=AssertionError("No network")):
                    with self.assertRaises(ValueError):
                        self.fetch(f"invalid-descriptor-{number}")
                self.assertFalse((self.root / f"invalid-descriptor-{number}").exists())

    def test_cli_outputs_json_and_explicit_prerequisite(self):
        args = ["shared_baseline.py", "fetch", "--descriptor", str(self.descriptor_path),
                "--output", str(self.root / "cli"), "--archive", str(self.archive)]
        with patch("sys.argv", args), patch("sys.stdout", new_callable=io.StringIO) as stdout:
            self.assertEqual(shared.main(), 0)
        self.assertEqual(json.loads(stdout.getvalue())["swaggerGeneration"], "not-run")
        with patch("sys.argv", args), patch("sys.stderr", new_callable=io.StringIO) as stderr:
            self.assertEqual(shared.main(), 1)
        self.assertIn("prerequisite failed", stderr.getvalue())
        self.assertIn("no Swagger generation was run", stderr.getvalue())

    def test_metadata_index_shards_and_source_hashes(self):
        mutations = [
            ("_meta.json", lambda value: value.update(complete=False)),
            ("_meta.json", lambda value: value.update(schemaVersion=3)),
            ("_meta.json", lambda value: value["summary"].update(compiledProjects=0)),
            ("_meta.json", lambda value: value["projects"][0].update(compileStatus="failed")),
            ("validator-results.json", lambda value: value.update(specsCommit="e" * 40)),
            ("validator-results.json", lambda value: value.update(totalViolations=2)),
            ("results/First.json", lambda value: value.update(results=[])),
            ("results/First.json", lambda value: value["results"][0].update(project="unknown")),
        ]
        for number, (name, mutate) in enumerate(mutations):
            with self.subTest(name=name, number=number):
                path = self.dataset.joinpath(*name.split("/"))
                original = path.read_bytes()
                value = shared.load_json(path)
                mutate(value)
                self.write(path, value)
                self.seal()  # Integrity alone must not bypass semantic checks.
                with self.assertRaises(ValueError):
                    self.fetch(f"bad-{number}")
                path.write_bytes(original)
        self.seal()
        (self.dataset / "source" / "main.tsp").write_bytes(b"changed source")
        self.pack()
        with self.assertRaisesRegex(ValueError, "inventory mismatch"):
            self.fetch("source-hash")

    def test_node_compact_identity(self):
        # Expected bytes are the exact JSON.stringify representation, not pretty JSON.
        value = {"schemaVersion": 1, "context": {"scope": "source", "unicode": "é"},
                 "projects": [{"compileDurationMs": 1.0}], "files": [{"file": "a\\b"}]}
        expected = ('{"schemaVersion":1,"context":{"scope":"source","unicode":"é"},'
                    '"projects":[{"compileDurationMs":1}],"files":[{"file":"a\\\\b"}]}')
        self.assertEqual(shared.identity(value), hashlib.sha256(expected.encode("utf-8")).hexdigest())
        self.assertEqual(shared.identity({"2": 2, "1": 1, "a": -0.0}),
                         hashlib.sha256(b'{"1":1,"2":2,"a":0}').hexdigest())

    def test_sanitized_publication_provenance_allowed(self):
        self.manifest["sourceBaselineIdentity"] = "e" * 64
        self.manifest["publicationSanitization"] = {
            "replacements": ["$BASELINE_DATASET", "$SPECS_ROOT"],
            "files": [{"sourceSha256": "a" * 64, "publishedSha256": "b" * 64}]}
        self.seal()
        self.assertEqual(self.fetch()["baselineIdentity"], self.descriptor["baselineIdentity"])


if __name__ == "__main__":
    unittest.main()
