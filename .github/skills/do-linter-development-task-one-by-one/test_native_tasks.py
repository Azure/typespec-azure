import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("native_tasks.py")
SPEC = importlib.util.spec_from_file_location("native_tasks", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
CATALOG = [
    {"id": "RuleA", "applicability": "ARM"},
    {"id": "RuleB", "applicability": "Both"},
    {"id": "RuleC", "applicability": "DataPlane"},
]
NATIVE = "@azure-tools/typespec-azure-core/shared-policy"


def task(task_id="shared-policy", members=None, native=NATIVE):
    value = {"id": task_id, "validatorRules": members if members is not None else ["RuleA", "RuleB"]}
    if native is not None:
        value["nativeRule"] = native
    return value


def validate(*tasks):
    return MODULE.validate({"schemaVersion": 1, "tasks": list(tasks)}, CATALOG)["tasks"]


class NativeTasksTests(unittest.TestCase):
    def test_explicit_group_preserves_members_and_pending_target(self):
        result = validate(task(members=["rulea", "RULEB"], native=None))[0]
        self.assertEqual(result["validationStatus"], "valid")
        self.assertEqual(result["validatorRules"], ["RuleA", "RuleB"])
        self.assertNotIn("nativeRule", result)

    def test_singletons_stay_independent(self):
        result = validate(task("a", ["RuleA"], None), task("b", ["RuleB"], None))
        self.assertEqual([entry["id"] for entry in result], ["a", "b"])
        self.assertTrue(all(entry["validationStatus"] == "valid" for entry in result))

    def test_duplicate_member_within_group_and_across_tasks(self):
        for entries in [
            [task(members=["RuleA", "rulea"])],
            [task("a", ["RuleA"], None), task("b", ["RULEA"], None)],
        ]:
            with self.subTest(entries=entries):
                result = validate(*entries)
                self.assertEqual(result[-1]["validationStatus"], "invalid")
                self.assertTrue(any("Duplicate validator" in error for error in result[-1]["errors"]))

    def test_duplicate_task_id_and_native_target(self):
        result = validate(task("a", ["RuleA"]), task("a", ["RuleB"]))
        self.assertEqual(result[0]["validationStatus"], "valid")
        self.assertEqual(len(result[1]["errors"]), 2)

    def test_dataplane_unknown_and_zero_members_are_invalid(self):
        for members in [["RuleC"], ["Unknown"], [], ["RuleA", 1], "RuleA"]:
            with self.subTest(members=members):
                self.assertEqual(validate(task(members=members))[0]["validationStatus"], "invalid")

    def test_many_to_many_and_unknown_fields_are_rejected(self):
        for value in [
            {**task(), "nativeRule": [NATIVE, "@azure-tools/typespec-azure-core/other"]},
            {**task(), "extra": True},
            task(native="@typespec/http/not-an-azure-policy"),
            task(task_id="../escape"),
            None,
        ]:
            with self.subTest(value=value):
                self.assertEqual(validate(value)[0]["validationStatus"], "invalid")

    def test_invalid_entry_does_not_drop_later_unrelated_task(self):
        result = validate(task("bad", ["Unknown"]), task("good", ["RuleB"], None))
        self.assertEqual([entry["validationStatus"] for entry in result], ["invalid", "valid"])

    def test_bad_document_or_catalog_blocks_invocation(self):
        for document in [
            [],
            {"schemaVersion": True, "tasks": [task()]},
            {"schemaVersion": 2, "tasks": [task()]},
            {"schemaVersion": 1, "tasks": []},
            {"schemaVersion": 1, "tasks": [task()], "extra": True},
        ]:
            with self.subTest(document=document), self.assertRaises(ValueError):
                MODULE.validate(document, CATALOG)
        with self.assertRaises(ValueError):
            MODULE.validate({"schemaVersion": 1, "tasks": [task()]}, CATALOG + [CATALOG[0]])

    def test_cli_is_read_only_and_reports_partial_invalidity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "tasks.json"
            catalog = root / "catalog.json"
            source.write_text(
                json.dumps({"schemaVersion": 1, "tasks": [task("bad", ["RuleC"]), task("ok", ["RuleA"], None)]}),
                encoding="utf-8",
            )
            catalog.write_text(json.dumps(CATALOG), encoding="utf-8")
            before = {path.name: path.read_bytes() for path in root.iterdir()}
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--task-file", str(source), "--catalog", str(catalog)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertEqual(
                [entry["validationStatus"] for entry in json.loads(result.stdout)["tasks"]],
                ["invalid", "valid"],
            )
            self.assertEqual(before, {path.name: path.read_bytes() for path in root.iterdir()})

    def test_duplicate_keys_and_duplicate_cli_flags_block(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "tasks.json"
            source.write_text('{"schemaVersion":1,"schemaVersion":1,"tasks":[]}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
                MODULE.read_json(source)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--task-file", str(source),
                 "--task-file", str(source), "--catalog", str(source)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("Duplicate option", result.stderr)


if __name__ == "__main__":
    unittest.main()
