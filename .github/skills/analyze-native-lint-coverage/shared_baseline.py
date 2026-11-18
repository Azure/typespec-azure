"""Download and verify a sealed shared Swagger baseline; never generate one."""

import argparse
from datetime import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
from urllib.parse import quote
import uuid


PRIVATE_REPOSITORY = "Azure/azure-rest-api-specs-pr"
PRIVATE_REF = "evidence/shared-swagger-baseline-rpsaas"
PRIVATE_DISCOVERY = ".lintdiff-baselines/rpsaas/current.json"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def parse_json(text):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, f"Duplicate JSON key: {key}")
            result[key] = value
        return result

    return json.loads(text, object_pairs_hook=pairs,
                      parse_constant=lambda value: require(False, f"Invalid JSON: {value}"))


def load_json(path):
    return parse_json(Path(path).read_text(encoding="utf-8"))


def identity(value):
    # Baseline schema numbers are safe integers (including millisecond durations).
    # Order integer property keys as JSON.stringify does, without sorting other keys.
    def compact(item):
        if isinstance(item, dict):
            numeric = sorted((key for key in item if re.fullmatch(r"0|[1-9][0-9]*", key)
                              and int(key) < 4294967295), key=int)
            numeric_set = set(numeric)
            keys = numeric + [key for key in item if key not in numeric_set]
            return "{" + ",".join(compact(key) + ":" + compact(item[key]) for key in keys) + "}"
        if isinstance(item, list):
            return "[" + ",".join(map(compact, item)) + "]"
        if isinstance(item, (int, float)) and not isinstance(item, bool):
            require(math.isfinite(item) and item == int(item) and abs(item) <= 9007199254740991,
                    "Baseline identity requires safe integer schema numbers")
            return str(int(item))
        text = json.dumps(item, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        return "".join(f"\\u{ord(char):04x}" if 0xD800 <= ord(char) <= 0xDFFF else char
                       for char in text)

    return hashlib.sha256(compact(value).encode("utf-8")).hexdigest()


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def fields(value, names, label):
    require(isinstance(value, dict) and set(value) == set(names.split()), f"Invalid {label} fields")


def hex_value(value, length, label):
    require(isinstance(value, str) and re.fullmatch(f"[0-9a-f]{{{length}}}", value),
            f"Invalid {label}")


def integer(value, minimum=0):
    return type(value) is int and minimum <= value <= 9007199254740991


def timestamp(value):
    require(isinstance(value, str) and value.endswith("Z"), "Expected UTC timestamp")
    datetime.fromisoformat(value.replace("Z", "+00:00"))


def token(value):
    return isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", value)


def repository(value):
    return isinstance(value, str) and len(value.split("/")) == 2 and all(
        token(part) for part in value.split("/"))


def ref_name(value):
    require(isinstance(value, str) and value and ".." not in value and
            all(token(part) and not part.endswith((".", ".lock")) for part in value.split("/")),
            "Invalid metadata ref")
    return value


def validate_corpus(value):
    fields(value, "profile sourceBranch serviceList services versionPolicy projectVersions "
           "validationProfile", "private corpus")
    require(value["profile"] == "rpsaas-private" and value["sourceBranch"] == "RPSaaSMaster"
            and value["versionPolicy"] == "all-supported", "Unsupported private corpus policy")
    service_list = value["serviceList"]
    fields(service_list, "url updatedAt sha256", "service-list identity")
    require(isinstance(service_list["url"], str) and re.fullmatch(
        r"https://github\.com/Azure/azure-rest-api-specs-pr/issues/[1-9][0-9]*"
        r"#issuecomment-[1-9][0-9]*", service_list["url"]), "Invalid private service-list URL")
    timestamp(service_list["updatedAt"])
    hex_value(service_list["sha256"], 64, "service-list checksum")
    services = value["services"]
    require(isinstance(services, list) and services and
            all(isinstance(service, str) and re.fullmatch(
                r"specification/[A-Za-z0-9][A-Za-z0-9._-]*", service) for service in services),
            "Invalid private service allowlist")
    require(len({service.casefold() for service in services}) == len(services),
            "Duplicate private service")
    versions = value["projectVersions"]
    require(isinstance(versions, list) and versions, "Missing private project/version inventory")
    selected = set()
    project_names = {}
    observed_services = set()
    for entry in versions:
        fields(entry, "project apiVersion", "project/version entry")
        project = relative_name(entry["project"])
        require(project == entry["project"] and token(entry["apiVersion"]),
                "Invalid project/version identity")
        service = "/".join(project.split("/")[:2])
        require(service in services, "Project outside private allowlist")
        require(project_names.setdefault(project.casefold(), project) == project,
                "Case-colliding private project paths")
        key = (project.casefold(), entry["apiVersion"].casefold())
        require(key not in selected, "Duplicate project/version identity")
        selected.add(key)
        observed_services.add(service)
    require(observed_services == set(services), "Private service population mismatch")
    profile = value["validationProfile"]
    fields(profile, "id sha256", "validation profile")
    require(profile["id"] == "production-arm", "Unsupported private validation profile")
    hex_value(profile["sha256"], 64, "validation profile checksum")


def validate_descriptor(value):
    require(isinstance(value, dict) and type(value.get("schemaVersion")) is int
            and value["schemaVersion"] in (1, 2), "Unsupported descriptor schema")
    private = value["schemaVersion"] == 2
    fields(value, "schemaVersion baselineId assessmentMode source producer dataset baselineIdentity archive"
           + (" corpus" if private else ""),
           "descriptor")
    if private:
        validate_corpus(value["corpus"])
    require(value["assessmentMode"] == "swagger-baseline", "Not a Swagger baseline descriptor")
    require(token(value["baselineId"]), "Invalid baselineId")
    hex_value(value["baselineIdentity"], 64, "baselineIdentity")
    source = value["source"]
    fields(source, "repository commit preservationRepository preservationRef", "source")
    require(source["repository"] == (PRIVATE_REPOSITORY if private else "Azure/azure-rest-api-specs"),
            "Unsupported source repository")
    require(repository(source["preservationRepository"]), "Invalid preservation repository")
    hex_value(source["commit"], 40, "source commit")
    require(isinstance(source["preservationRef"], str) and
            all(token(part) for part in source["preservationRef"].split("/")),
            "Invalid preservation ref")
    producer = value["producer"]
    fields(producer, "candidateRepository candidateCommit coreCommit toolingRepository toolingCommit "
           "nodeVersion scope selection observedAt", "producer")
    for key in ("candidateRepository", "toolingRepository"):
        require(producer[key] == "Azure/typespec-azure", f"Unsupported {key}")
    for key in ("candidateCommit", "coreCommit", "toolingCommit"):
        hex_value(producer[key], 40, key)
    require(isinstance(producer["nodeVersion"], str) and
            re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+", producer["nodeVersion"]), "Invalid Node version")
    require(producer["scope"] in ("source", "http-reachable", "boolean-http"), "Invalid scope")
    fields(producer["selection"], "serviceType filter limit", "selection")
    require(producer["selection"] == {"serviceType": "resource-manager", "filter": None, "limit": None},
            "Shared baseline requires full ARM population")
    timestamp(producer["observedAt"])
    counts = value["dataset"]
    fields(counts, "projects swaggerFiles compileFailures validationFailures observations rulesWithFindings"
           + (" projectVersions" if private else ""),
           "dataset counts")
    require(all(integer(count) for count in counts.values()) and counts["projects"] > 0
            and counts["swaggerFiles"] > 0 and counts["compileFailures"] == 0
            and counts["validationFailures"] == 0, "Invalid or failed dataset counts")
    if private:
        versions = value["corpus"]["projectVersions"]
        require(counts["projectVersions"] == len(versions) and
                counts["projects"] == len({entry["project"] for entry in versions}),
                "Private descriptor population mismatch")
    archive = value["archive"]
    fields(archive, "repository release name sha256 bytes", "archive")
    require(repository(archive["repository"]) and
            archive["repository"] == source["preservationRepository"], "Invalid archive repository")
    require(token(archive["release"]) and token(archive["name"])
            and archive["name"].endswith(".tar.gz"), "Invalid archive release/name")
    hex_value(archive["sha256"], 64, "archive checksum")
    require(integer(archive["bytes"], 1), "Invalid archive size")
    return value


def gh(endpoint, raw=False):
    args = ["gh", "api", endpoint]
    if raw:
        args += ["-H", "Accept: application/vnd.github.raw+json"]
    return subprocess.run(args, check=True, stdout=subprocess.PIPE).stdout


def require_private_repository(name):
    require(repository(name), "Invalid private repository")
    info = parse_json(gh(f"repos/{name}"))
    require(info.get("private") is True and info.get("permissions", {}).get("pull") is True,
            "Private baseline repository must be private and readable")


def validate_binding(value, descriptor, descriptor_sha):
    fields(value, "schemaVersion corpusProfile metadataRepository metadataRef metadataCommit "
           "discoveryPath discoverySha256 descriptorPath descriptorSha256 baselineId "
           "baselineIdentity corpusIdentity", "private discovery binding")
    require(type(value["schemaVersion"]) is int and value["schemaVersion"] == 1
            and value["corpusProfile"] == "rpsaas-private", "Invalid private discovery binding")
    require(repository(value["metadataRepository"]), "Invalid metadata repository")
    ref_name(value["metadataRef"])
    hex_value(value["metadataCommit"], 40, "metadata commit")
    for key in ("discoveryPath", "descriptorPath"):
        relative_name(value[key])
    for key in ("discoverySha256", "descriptorSha256", "baselineIdentity", "corpusIdentity"):
        hex_value(value[key], 64, key)
    require(value["descriptorSha256"] == descriptor_sha and
            value["baselineId"] == descriptor["baselineId"] and
            value["baselineIdentity"] == descriptor["baselineIdentity"] and
            value["corpusIdentity"] == identity(descriptor["corpus"]),
            "Private discovery binding mismatch")
    return value


def discover(output, repository_name=PRIVATE_REPOSITORY, ref=PRIVATE_REF,
             discovery_path=PRIVATE_DISCOVERY):
    output = Path(output)
    require(output.is_absolute() and not output.exists() and not output.is_symlink(),
            "Discovery output must be absolute and must not exist")
    ref_name(ref)
    discovery_path = relative_name(discovery_path)
    output.mkdir(parents=True, exist_ok=False)
    require_private_repository(repository_name)
    commit = parse_json(gh(f"repos/{repository_name}/commits/{quote(ref, safe='')}"))["sha"]
    hex_value(commit, 40, "metadata commit")

    def read_at_commit(name):
        return gh(f"repos/{repository_name}/contents/{quote(name, safe='/')}?ref={commit}", raw=True)

    discovery_bytes = read_at_commit(discovery_path)
    (output / "discovery.json").write_bytes(discovery_bytes)
    discovery = parse_json(discovery_bytes)
    fields(discovery, "schemaVersion corpusProfile baselineId descriptorPath descriptorSha256",
           "private discovery")
    require(type(discovery["schemaVersion"]) is int and discovery["schemaVersion"] == 2
            and discovery["corpusProfile"] == "rpsaas-private", "Unsupported private discovery")
    hex_value(discovery["descriptorSha256"], 64, "descriptor checksum")
    descriptor_path = relative_name(discovery["descriptorPath"])
    descriptor_bytes = read_at_commit(descriptor_path)
    (output / "descriptor.json").write_bytes(descriptor_bytes)
    descriptor_sha = hashlib.sha256(descriptor_bytes).hexdigest()
    require(descriptor_sha == discovery["descriptorSha256"], "Discovery descriptor checksum mismatch")
    descriptor = validate_descriptor(parse_json(descriptor_bytes))
    require(descriptor["schemaVersion"] == 2 and
            descriptor["baselineId"] == discovery["baselineId"], "Private discovery identity mismatch")
    binding = validate_binding({
        "schemaVersion": 1, "corpusProfile": "rpsaas-private",
        "metadataRepository": repository_name, "metadataRef": ref, "metadataCommit": commit,
        "discoveryPath": discovery_path,
        "discoverySha256": hashlib.sha256(discovery_bytes).hexdigest(),
        "descriptorPath": descriptor_path, "descriptorSha256": descriptor_sha,
        "baselineId": descriptor["baselineId"], "baselineIdentity": descriptor["baselineIdentity"],
        "corpusIdentity": identity(descriptor["corpus"])}, descriptor, descriptor_sha)
    (output / "binding.json").write_text(json.dumps(binding, indent=2) + "\n",
                                       encoding="utf-8", newline="\n")
    return {"descriptor": str(output / "descriptor.json"), "binding": str(output / "binding.json"),
            "metadataCommit": commit, "baselineIdentity": descriptor["baselineIdentity"]}


def relative_name(value):
    require(isinstance(value, str) and value and "\\" not in value[:1], "Invalid relative path")
    parts = value.replace("\\", "/").split("/")
    require(all(part not in ("", ".", "..") and not re.search(r'[:\x00-\x1f<>\"|?*]', part)
                and not part.endswith((" ", "."))
                and not re.fullmatch(r"(?i:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\..*)?", part)
                for part in parts), f"Unsafe path: {value}")
    return "/".join(parts)


def extract(archive, output):
    seen = {}
    directories = {}
    with tarfile.open(archive, "r:gz") as stream:
        for member in stream:
            require(member.isfile() or member.isdir(), f"Unsafe archive type: {member.name}")
            name = relative_name(member.name.rstrip("/") if member.isdir() else member.name)
            require(name in ("manifest.json", "baseline.json", "dataset") or
                    name.startswith("dataset/"), f"Unexpected archive member: {name}")
            require((name == "dataset" and member.isdir()) or name.startswith("dataset/")
                    or (name in ("manifest.json", "baseline.json") and member.isfile()),
                    "Invalid archive root type")
            require(name.casefold() not in seen, f"Duplicate/case-colliding archive member: {name}")
            require(name.casefold() not in directories or
                    (member.isdir() and directories[name.casefold()] == name),
                    "Archive directory collision")
            parts = name.split("/")
            for index in range(1, len(parts)):
                parent = "/".join(parts[:index])
                prior = seen.get(parent.casefold())
                require(prior is None or prior == (parent, True), "Archive ancestor collision")
                require(directories.get(parent.casefold(), parent) == parent,
                        "Archive ancestor case collision")
                directories[parent.casefold()] = parent
            seen[name.casefold()] = (name, member.isdir())
            target = output.joinpath(*parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with stream.extractfile(member) as source, target.open("xb") as destination:
                    shutil.copyfileobj(source, destination)


def inventory(root):
    result = {}
    pending = [root]
    names = set()
    while pending:
        with os.scandir(pending.pop()) as entries:
            for entry in entries:
                require(not entry.is_symlink(), "Symlink in extracted dataset")
                path = Path(entry.path)
                name = relative_name(path.relative_to(root).as_posix())
                require(name.casefold() not in names, "Case-colliding dataset path")
                names.add(name.casefold())
                if entry.is_dir(follow_symlinks=False):
                    pending.append(path)
                else:
                    require(entry.is_file(follow_symlinks=False), "Special dataset file")
                    result[name] = digest(path)
    return result


def verify(output, descriptor):
    private = descriptor["schemaVersion"] == 2
    dataset_schema = 5 if private else 4
    manifest = load_json(output / "manifest.json")
    baseline = load_json(output / "baseline.json")
    require(isinstance(manifest, dict) and isinstance(baseline, dict), "Invalid sealed JSON objects")
    require(type(manifest.get("schemaVersion")) is int
            and manifest.get("schemaVersion") == 2 and manifest.get("status") == "complete"
            and manifest.get("assessmentMode") == "swagger-baseline"
            and manifest.get("completionScope") == "swagger-only"
            and manifest.get("nativeAssessment") == "not-run", "Invalid Swagger-only sealed manifest")
    timestamp(manifest.get("finishedAt"))
    require(type(baseline.get("schemaVersion")) is int
            and baseline.get("schemaVersion") == (2 if private else 1),
            "Unsupported baseline schema")
    require(identity(baseline) == descriptor["baselineIdentity"] == manifest.get("baselineIdentity"),
            "Baseline identity mismatch")
    context = baseline["context"]
    require(isinstance(context, dict), "Invalid baseline context")
    require(context["specsCommit"] == descriptor["source"]["commit"], "Source commit mismatch")
    producer = descriptor["producer"]
    for key in ("candidateCommit", "coreCommit", "nodeVersion", "scope"):
        require(context[key] == producer[key], f"Producer {key} mismatch")
    require(context.get("filter") is None and context.get("limit") is None,
            "Baseline selection mismatch")
    if private:
        require(context.get("corpus") == descriptor["corpus"] and
                context["specsRepository"].removesuffix(".git") ==
                "https://github.com/" + descriptor["source"]["repository"],
                "Private corpus/source context mismatch")
    root = output / "dataset"
    actual = inventory(root)
    expected = {}
    folded = set()
    require(isinstance(baseline["files"], list) and baseline["files"], "Missing file inventory")
    for entry in baseline["files"]:
        fields(entry, "file sha256", "inventory entry")
        name = relative_name(entry["file"])
        require(name.casefold() not in folded, "Duplicate inventory entry")
        folded.add(name.casefold())
        hex_value(entry["sha256"], 64, "file checksum")
        expected[name] = entry["sha256"]
    require(actual == expected, "Dataset inventory mismatch: missing, unexpected or corrupt files")

    def referenced(name):
        normalized = relative_name(name)
        require(normalized in actual, f"Missing dataset reference: {name}")
        return root.joinpath(*normalized.split("/"))

    meta = load_json(referenced("_meta.json"))
    commit = context["specsCommit"]
    require(isinstance(meta, dict) and type(meta.get("schemaVersion")) is int
            and meta.get("schemaVersion") == dataset_schema and meta.get("complete") is True
            and meta.get("specsCommit") == commit
            and meta.get("specsRepository") == context["specsRepository"]
            and meta.get("filters") == {"serviceType": "resource-manager",
                                       **({"corpus": descriptor["corpus"]} if private else {})},
            "Incompatible dataset metadata")
    projects = meta["projects"]
    counts = descriptor["dataset"]
    require(isinstance(projects, list)
            and len(projects) == counts["projectVersions" if private else "projects"]
            and projects == baseline["projects"], "Project population mismatch")
    selected = set()
    selected_names = set()
    selected_versions = set()
    swagger_count = 0
    for project in projects:
        name = relative_name(project["sourcePath"])
        version = project.get("apiVersion")
        key = (name.casefold(), version) if private else name.casefold()
        require(key not in selected_names and project["compileStatus"] == "success"
                and project["validationStatus"] == "success", "Duplicate or failed project")
        selected.add(name)
        selected_names.add(key)
        if private:
            require(token(version) and project["swaggerFiles"], "Missing private version Swagger")
            selected_versions.add((name, version))
        for key in ("typespecFiles", "swaggerFiles", "swaggerAssets", "rawFiles"):
            require(isinstance(project[key], list), f"Missing project inventory: {key}")
            for file in project[key]:
                referenced(file)
        swagger_count += len(project["swaggerFiles"])
        if private:
            for file in project["swaggerFiles"]:
                document = load_json(referenced(file))
                require(document.get("info", {}).get("version") == version,
                        "Private Swagger API-version mismatch")
    if private:
        require(selected_versions == {(entry["project"], entry["apiVersion"])
                                      for entry in descriptor["corpus"]["projectVersions"]},
                "Private project/version population mismatch")
    require(swagger_count == counts["swaggerFiles"], "Swagger file count mismatch")
    for key in ("commonTypesFiles", "resultFiles"):
        require(isinstance(meta[key], list), f"Missing metadata inventory: {key}")
        for file in meta[key]:
            referenced(file)
    summary = meta["summary"]
    required = {
        "discoveredProjects": counts["projects"], "compiledProjects": counts["projects"],
        "failedProjects": 0, "emittedSwaggerFiles": counts["swaggerFiles"],
        "validatedProjects": counts["projects"], "validationFailures": 0,
        "violations": counts["observations"], "distinctRules": counts["rulesWithFindings"],
    }
    if private:
        required["projectVersions"] = counts["projectVersions"]
    require(summary == required, "Dataset summary mismatch")
    index = load_json(referenced("validator-results.json"))
    require(isinstance(index, dict) and type(index.get("schemaVersion")) is int
            and index.get("schemaVersion") == dataset_schema and index.get("specsCommit") == commit
            and isinstance(index.get("rules"), dict), "Invalid validator index")
    total = 0
    shards = []
    for rule, entry in index["rules"].items():
        require(rule and integer(entry["count"], 1), "Invalid validator index count")
        shard = load_json(referenced(entry["resultsFile"]))
        require(isinstance(shard, dict) and type(shard.get("schemaVersion")) is int
                and shard.get("schemaVersion") == dataset_schema and shard.get("specsCommit") == commit
                and shard.get("rule") == rule and isinstance(shard.get("results"), list)
                and len(shard["results"]) == entry["count"], f"Invalid validator shard: {rule}")
        for finding in shard["results"]:
            require(finding.get("rule") == rule and finding.get("project") in selected
                    and isinstance(finding.get("swaggerFile"), str)
                    and isinstance(finding.get("path"), list)
                    and all(isinstance(part, str) or integer(part) for part in finding["path"]),
                    f"Invalid validator observation: {rule}")
            if private:
                require((finding["project"], finding.get("apiVersion")) in selected_versions,
                        "Invalid private observation version")
        total += entry["count"]
        shards.append(relative_name(entry["resultsFile"]))
    require(sorted(shards) == sorted(relative_name(file) for file in meta["resultFiles"])
            and len(set(shards)) == len(shards), "Shard inventory mismatch")
    require(total == index.get("totalViolations") == counts["observations"]
            and len(shards) == counts["rulesWithFindings"], "Validator totals mismatch")


def fetch(descriptor_path, output, archive=None, binding=None):
    descriptor_path, output = Path(descriptor_path), Path(output)
    require(descriptor_path.is_absolute() and output.is_absolute(), "Use absolute descriptor/output paths")
    descriptor = validate_descriptor(load_json(descriptor_path))
    pinned = None
    if descriptor["schemaVersion"] == 2:
        require(binding is not None, "Private baseline requires a pinned discovery binding")
        binding = Path(binding)
        require(binding.is_absolute(), "Use an absolute binding path")
        pinned = validate_binding(load_json(binding), descriptor, digest(descriptor_path))
    else:
        require(binding is None, "Public baseline does not accept a private discovery binding")
    require(not output.exists() and not output.is_symlink(), "Output must not exist; preserve prior evidence")
    if archive is not None:
        archive = Path(archive)
        require(archive.is_absolute() and archive.is_file(), "Use an absolute existing archive path")
    output.mkdir(parents=True, exist_ok=False)
    if archive is None:
        if pinned:
            require_private_repository(descriptor["archive"]["repository"])
        # Private download staging stays beside the requested output, never in system temp.
        staging = output.parent / (output.name + ".download-" + uuid.uuid4().hex)
        staging.mkdir(mode=0o700)
        info = descriptor["archive"]
        subprocess.run(["gh", "release", "download", info["release"], "--repo", info["repository"],
                        "--pattern", info["name"], "--dir", str(staging)], check=True)
        archive = staging / info["name"]
    require(archive.stat().st_size == descriptor["archive"]["bytes"], "Archive size mismatch")
    require(digest(archive) == descriptor["archive"]["sha256"], "Archive SHA256 mismatch")
    extract(archive, output)
    verify(output, descriptor)
    return {"baselineRun": str(output.resolve()), "baselineId": descriptor["baselineId"],
            "sourceCommit": descriptor["source"]["commit"],
            "baselineIdentity": descriptor["baselineIdentity"], "swaggerGeneration": "not-run",
            **({"binding": pinned} if pinned else {})}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    discover_parser = commands.add_parser("discover", help="Pin private baseline metadata; never produce it")
    discover_parser.add_argument("--repository", default=PRIVATE_REPOSITORY)
    discover_parser.add_argument("--ref", default=PRIVATE_REF)
    discover_parser.add_argument("--path", default=PRIVATE_DISCOVERY)
    discover_parser.add_argument("--output", required=True)
    fetch_parser = commands.add_parser("fetch")
    fetch_parser.add_argument("--descriptor", required=True)
    fetch_parser.add_argument("--output", required=True)
    fetch_parser.add_argument("--archive")
    fetch_parser.add_argument("--binding")
    args = parser.parse_args()
    try:
        result = (discover(args.output, args.repository, args.ref, args.path)
                  if args.command == "discover" else
                  fetch(args.descriptor, args.output, args.archive, args.binding))
        print(json.dumps(result))
    except (ValueError, KeyError, TypeError, AttributeError, OverflowError, OSError, tarfile.TarError,
            subprocess.CalledProcessError) as error:
        print(f"Shared Swagger baseline prerequisite failed: {error}. "
              "Recover the pinned sealed asset/descriptor or request a separate producer refresh; "
              "no Swagger generation was run. Failed output/download evidence is retained.",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
