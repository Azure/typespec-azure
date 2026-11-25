import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const evaluationManifest = JSON.parse(
  readFileSync(new URL("./evaluation-manifest.json", import.meta.url), "utf8"),
);

export function parseEvaluationArgs(args, env = process.env) {
  const options = { repository: env.AZURE_REST_API_SPECS, out: undefined, help: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--repo" || arg === "--out") {
      const value = args[++index];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value.`);
      }
      options[arg === "--repo" ? "repository" : "out"] = value;
    } else {
      throw new Error(`Unknown evaluation argument: ${arg}`);
    }
  }
  if (!options.help && !options.repository) {
    throw new Error(
      "Provide --repo <checkout> or AZURE_REST_API_SPECS. See --help for explicit setup.",
    );
  }
  return options;
}

export function resolveEvaluationInputs(repository, manifest = evaluationManifest) {
  const root = path.resolve(repository);
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  const revision = git("rev-parse", "HEAD");
  if (revision !== manifest.revision) {
    throw new Error(`Expected specs revision ${manifest.revision}, found ${revision} in ${root}.`);
  }
  if (git("status", "--porcelain", "--untracked-files=no")) {
    throw new Error(`Specs checkout has tracked modifications: ${root}`);
  }
  const specs = manifest.specs.map((spec) => {
    const specRoot = path.resolve(root, spec.relativePath);
    if (!existsSync(path.join(specRoot, "main.tsp"))) {
      throw new Error(`Missing evaluation entrypoint: ${path.join(specRoot, "main.tsp")}`);
    }
    return { ...spec, root: specRoot };
  });
  return { repository: root, revision, specs };
}
