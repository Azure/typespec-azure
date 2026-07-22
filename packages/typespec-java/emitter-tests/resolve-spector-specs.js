// Resolve the opt-in spector.config.yaml into a JSON list of specs to generate,
// consumed by Generate.ps1. Each entry is { tspFile, options } where options are
// fully-qualified @azure-tools/typespec-java emitter options (without the random
// output-dir, which Generate.ps1 appends per run).
//
// Usage: node resolve-spector-specs.js <specsDir>
/* eslint-disable no-console */
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
// Imported by relative path into the sibling workspace package: emitter-tests is a
// standalone project that installs pinned registry versions (it mimics an external
// SDK consumer), so the unpublished @azure-tools/spector-runner cannot be a normal
// dependency here. The repo-wide `pnpm build` builds spector-runner before this runs.
import { loadSpectorConfig, resolveSpecs } from "../../spector-runner/dist/src/index.js";

const EMITTER = "@azure-tools/typespec-java";

const specsDir = process.argv[2];
if (!specsDir) {
  console.error("usage: resolve-spector-specs.js <specsDir>");
  process.exit(1);
}

const configPath = fileURLToPath(new URL("./spector.config.yaml", import.meta.url));
const config = loadSpectorConfig(configPath);

function resolveTspFile(key) {
  // Keys ending in .tsp point at a specific entry file (e.g. resiliency old/main).
  if (key.endsWith(".tsp")) {
    return join(specsDir, key);
  }
  // Otherwise prefer client.tsp over main.tsp (matches the emitter's behavior).
  const client = join(specsDir, key, "client.tsp");
  if (existsSync(client)) {
    return client;
  }
  return join(specsDir, key, "main.tsp");
}

const result = resolveSpecs(config).map(({ path, options }) => ({
  tspFile: resolveTspFile(path),
  options: Object.entries(options).map(([k, v]) => `${EMITTER}.${k}=${v}`),
}));

process.stdout.write(JSON.stringify(result));
