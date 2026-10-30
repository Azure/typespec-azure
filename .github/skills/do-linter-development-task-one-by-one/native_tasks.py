"""Read-only validation of explicit native-first migration tasks."""

import argparse
import json
import re
import sys
from pathlib import Path


NATIVE_RULE = re.compile(
    r"@azure-tools/typespec-(?:azure-core|azure-resource-manager|client-generator-core)"
    r"/[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
)
TASK_ID = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path):
    if not path.is_absolute():
        raise ValueError(f"Expected an absolute path: {path}")
    with path.open(encoding="utf-8-sig") as stream:
        return json.load(stream, object_pairs_hook=unique_object)


def validate(document, catalog):
    if not isinstance(document, dict) or set(document) != {"schemaVersion", "tasks"}:
        raise ValueError("Expected only schemaVersion and tasks at the document root")
    if type(document["schemaVersion"]) is not int or document["schemaVersion"] != 1:
        raise ValueError("Unsupported schemaVersion; expected integer 1")
    if not isinstance(document["tasks"], list) or not document["tasks"]:
        raise ValueError("tasks must be a nonempty array")
    if not isinstance(catalog, list):
        raise ValueError("The validator catalog must be a JSON array")
    rules = {}
    for row in catalog:
        if not isinstance(row, dict) or not isinstance(row.get("id"), str):
            raise ValueError("Every catalog row must have a string id")
        key = row["id"].casefold()
        if key in rules:
            raise ValueError(f"Duplicate catalog rule: {row['id']}")
        rules[key] = row

    seen_ids, seen_rules, seen_native = set(), set(), set()
    results = []
    for index, task in enumerate(document["tasks"], 1):
        errors = []
        result = {"entry": index, "input": task}
        if not isinstance(task, dict):
            errors.append("Task must be an object")
        else:
            if set(task) - {"id", "validatorRules", "nativeRule"}:
                errors.append("Unknown task fields")
            task_id = task.get("id")
            if not isinstance(task_id, str) or not TASK_ID.fullmatch(task_id):
                errors.append("id must be a lowercase kebab-case identifier")
            elif task_id in seen_ids:
                errors.append(f"Duplicate task id: {task_id}")
            else:
                seen_ids.add(task_id)
                result["id"] = task_id
            members = task.get("validatorRules")
            canonical = []
            if not isinstance(members, list) or not members:
                errors.append("validatorRules must be a nonempty array")
            else:
                for member in members:
                    if not isinstance(member, str) or not member:
                        errors.append("Every validatorRules member must be a rule ID string")
                        continue
                    key = member.casefold()
                    if key in seen_rules:
                        errors.append(f"Duplicate validator membership: {member}")
                    seen_rules.add(key)
                    row = rules.get(key)
                    if row is None:
                        errors.append(f"Unknown validator rule: {member}")
                    elif row.get("applicability") not in ("ARM", "Both"):
                        errors.append(
                            f"Ineligible validator {row['id']}: {row.get('applicability')}"
                        )
                    else:
                        canonical.append(row["id"])
            result["validatorRules"] = canonical
            if "nativeRule" in task:
                native = task["nativeRule"]
                if not isinstance(native, str) or not NATIVE_RULE.fullmatch(native):
                    errors.append("nativeRule must name one rule in an official Azure lint package")
                elif native in seen_native:
                    errors.append(f"Duplicate native target across tasks: {native}")
                else:
                    seen_native.add(native)
                    result["nativeRule"] = native
        result["validationStatus"] = "invalid" if errors else "valid"
        result["errors"] = errors
        results.append(result)
    return {"schemaVersion": 1, "flowVersion": "native-first", "tasks": results}


class Once(argparse.Action):
    def __call__(self, parser, namespace, values, option_string=None):
        if getattr(namespace, self.dest, None) is not None:
            parser.error(f"Duplicate option: {option_string}")
        setattr(namespace, self.dest, values)


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument("--task-file", type=Path, action=Once, required=True)
    parser.add_argument("--catalog", type=Path, action=Once, required=True)
    args = parser.parse_args()
    try:
        result = validate(read_json(args.task_file), read_json(args.catalog))
    except (OSError, ValueError) as error:
        parser.exit(2, f"native_tasks: {error}\n")
    print(json.dumps(result, indent=2))
    return int(any(task["validationStatus"] == "invalid" for task in result["tasks"]))


if __name__ == "__main__":
    sys.exit(main())
