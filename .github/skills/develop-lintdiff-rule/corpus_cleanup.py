"""Archive and restore only verified specs:typespec outputs, never source files."""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys


SCOPE = Path("packages") / "typespec-lintdiff" / "specs"
ROOT_OUTPUTS = {
    "_meta.json",
    "typespec-results.json",
    "comparison-results.json",
    "comparison-results.md",
    "coverage-breakdown.json",
    "coverage-breakdown.md",
}
RAW_OUTPUTS = {
    "typespec.stdout.txt",
    "typespec.stderr.txt",
    "typespec.projected-http-graph.json",
    "typespec.projected-enum.json",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def generated(name):
    parts = PurePosixPath(name).parts
    return (
        name in ROOT_OUTPUTS
        or (
            len(parts) == 3
            and parts[:2] == ("results", "by-typespec-rule")
            and parts[-1].endswith(".json")
        )
        or (
            len(parts) >= 4
            and parts[0] == "projects"
            and parts[-2] == "raw"
            and parts[-1] in RAW_OUTPUTS
        )
    )


def git(repo, *args):
    return subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True
    ).stdout


def no_link(path):
    info = path.lstat()
    if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
        raise ValueError(f"Links/reparse points are not supported: {path}")
    return info


def repository(path):
    repo = Path(path).absolute()
    if repo != repo.resolve():
        raise ValueError("Repository path must be physical, without links")
    top = Path(os.fsdecode(git(repo, "rev-parse", "--show-toplevel")).strip())
    if top.resolve() != repo:
        raise ValueError("Expected the exact repository root")
    for part in (repo / SCOPE, *(repo / SCOPE).parents):
        no_link(part)
        if part == repo:
            break
    return repo


def identity(repo):
    return {
        "repo": str(repo),
        "head": git(repo, "rev-parse", "HEAD").decode().strip(),
        "index": digest(git(repo, "ls-files", "--stage", "-z", "--", str(SCOPE))),
    }


def artifact_dir(path, repo):
    target = Path(path).absolute()
    if target.resolve() == repo or repo in target.resolve().parents:
        raise ValueError("Evidence must be outside the repository")
    target.mkdir(parents=True, exist_ok=False)
    return target


def fail_walk(error):
    raise error


def inventory(repo, archive=None):
    root = repo / SCOPE
    result = {}
    for directory, dirs, files in os.walk(root, followlinks=False, onerror=fail_walk):
        for name in dirs:
            no_link(Path(directory) / name)
        for name in files:
            path = Path(directory) / name
            info = no_link(path)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise ValueError(f"Expected a regular, unlinked file: {path}")
            data = path.read_bytes()
            key = path.relative_to(root).as_posix()
            sha = digest(data)
            result[key] = {"sha256": sha, "mode": stat.S_IMODE(info.st_mode)}
            if archive is not None and generated(key):
                objects = archive / "objects"
                objects.mkdir(exist_ok=True)
                blob = objects / sha
                if not blob.exists():
                    blob.write_bytes(data)
    return result


def save(path, value):
    data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()
    with path.open("xb") as stream:
        stream.write(data)
    return digest(data)


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def capture(repo, output):
    if git(repo, "diff", "--no-ext-diff", "--name-only", "HEAD", "--", str(SCOPE)):
        raise ValueError("Tracked corpus changes predate this run; preserve them and stop")
    output = artifact_dir(output, repo)
    binding = identity(repo)
    files = inventory(repo, output)
    unchanged_identity(repo, binding)
    if files != inventory(repo):
        raise ValueError("Corpus changed during capture; stop all writers")
    snapshot = {
        "version": 1,
        "identity": binding,
        "files": files,
    }
    sha = save(output / "snapshot.json", snapshot)
    return {"status": "captured", "snapshot": str(output), "sha256": sha}


def unchanged_identity(repo, expected):
    if identity(repo) != expected:
        raise ValueError("Repository, HEAD, or corpus index changed")


def plan(repo, snapshot_dir, output):
    snapshot_dir = Path(snapshot_dir).resolve()
    snapshot_path = snapshot_dir / "snapshot.json"
    before = load(snapshot_path)
    if before["version"] != 1:
        raise ValueError("Unsupported snapshot version")
    unchanged_identity(repo, before["identity"])
    after = inventory(repo)
    changed = sorted(
        name for name in before["files"].keys() | after.keys()
        if before["files"].get(name) != after.get(name)
    )
    unexpected = [name for name in changed if not generated(name)]
    if unexpected:
        raise ValueError(f"Non-output corpus paths changed; no cleanup: {unexpected}")
    output = artifact_dir(output, repo)
    archived = inventory(repo, output)
    if archived != after:
        raise ValueError("Corpus changed while archiving; stop all writers")
    unchanged_identity(repo, before["identity"])
    result = {
        "version": 1,
        "identity": before["identity"],
        "snapshot": str(snapshot_dir),
        "snapshot_sha256": digest(snapshot_path.read_bytes()),
        "after": after,
        "changes": [
            {
                "path": name,
                "before": before["files"].get(name),
                "after": after.get(name),
                "action": "restore" if name in before["files"] else "delete",
            }
            for name in changed
        ],
    }
    sha = save(output / "plan.json", result)
    return {
        "status": "planned",
        "plan": str(output),
        "sha256": sha,
        "changes": result["changes"],
    }


def safe_name(name):
    parts = PurePosixPath(name).parts
    if (
        not parts
        or any(part in (".", "..") for part in name.split("/"))
        or PurePosixPath(name).is_absolute()
        or "\\" in name
        or ":" in name
        or not generated(name)
    ):
        raise ValueError(f"Unsafe output path: {name}")


def apply(repo, plan_dir, approval):
    plan_dir = Path(plan_dir).resolve()
    plan_path = plan_dir / "plan.json"
    if digest(plan_path.read_bytes()) != approval:
        raise ValueError("Plan differs from the approved SHA256")
    data = load(plan_path)
    if data["version"] != 1:
        raise ValueError("Unsupported plan version")
    unchanged_identity(repo, data["identity"])
    snapshot_dir = Path(data["snapshot"])
    snapshot_path = snapshot_dir / "snapshot.json"
    if digest(snapshot_path.read_bytes()) != data["snapshot_sha256"]:
        raise ValueError("Baseline snapshot changed")
    before = load(snapshot_path)
    if before["version"] != 1 or before["identity"] != data["identity"]:
        raise ValueError("Snapshot identity differs from plan")
    if inventory(repo) != data["after"]:
        raise ValueError("Corpus changed after planning; approval is stale")
    expected = sorted(
        name for name in before["files"].keys() | data["after"].keys()
        if before["files"].get(name) != data["after"].get(name)
    )
    if [item["path"] for item in data["changes"]] != expected:
        raise ValueError("Plan omits or duplicates changed paths")
    originals = {}
    for item in data["changes"]:
        name = item["path"]
        safe_name(name)
        if (
            item["before"] != before["files"].get(name)
            or item["after"] != data["after"].get(name)
            or item["action"] != ("restore" if item["before"] else "delete")
        ):
            raise ValueError(f"Inconsistent change: {name}")
        if item["before"]:
            content = (snapshot_dir / "objects" / item["before"]["sha256"]).read_bytes()
            if digest(content) != item["before"]["sha256"]:
                raise ValueError(f"Corrupt baseline archive: {name}")
            originals[name] = content
        if item["after"]:
            content = (plan_dir / "objects" / item["after"]["sha256"]).read_bytes()
            if digest(content) != item["after"]["sha256"]:
                raise ValueError(f"Corrupt run archive: {name}")
    # An exclusive journal also prevents replay after partial application.
    with (plan_dir / "apply.jsonl").open("x", encoding="utf-8") as journal:
        journal.write(json.dumps({"status": "started", "plan_sha256": approval}) + "\n")
        journal.flush()
        for item in data["changes"]:
            name = item["path"]
            target = repo / SCOPE / Path(name)
            for parent in target.parents:
                if parent.exists():
                    no_link(parent)
                if parent == repo:
                    break
            if os.path.lexists(target):
                info = no_link(target)
                if info.st_nlink != 1 or item["after"] != {
                    "sha256": digest(target.read_bytes()),
                    "mode": stat.S_IMODE(info.st_mode),
                }:
                    raise ValueError(f"Output changed during cleanup: {name}")
            elif item["after"] is not None:
                raise ValueError(f"Output disappeared during cleanup: {name}")
            if item["before"]:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(originals[name])
                target.chmod(item["before"]["mode"])
            else:
                target.unlink()
            journal.write(json.dumps({"status": "applied", "path": name}) + "\n")
            journal.flush()
        if inventory(repo) != before["files"]:
            raise ValueError("Restored corpus does not match baseline")
        unchanged_identity(repo, data["identity"])
        journal.write(json.dumps({"status": "restored"}) + "\n")
    return {"status": "restored", "files": len(data["changes"])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path)
    actions = parser.add_subparsers(dest="action", required=True)
    capture_args = actions.add_parser("capture")
    capture_args.add_argument("--output", required=True, type=Path)
    plan_args = actions.add_parser("plan")
    plan_args.add_argument("--snapshot", required=True, type=Path)
    plan_args.add_argument("--output", required=True, type=Path)
    plan_args.add_argument("--quiescent", required=True, action="store_true")
    apply_args = actions.add_parser("apply")
    apply_args.add_argument("--plan", required=True, type=Path)
    apply_args.add_argument("--approve", required=True)
    apply_args.add_argument("--quiescent", required=True, action="store_true")
    args = parser.parse_args()
    try:
        repo = repository(args.repo)
        if args.action == "capture":
            result = capture(repo, args.output)
        elif args.action == "plan":
            result = plan(repo, args.snapshot, args.output)
        else:
            result = apply(repo, args.plan, args.approve)
        print(json.dumps(result, ensure_ascii=True))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
