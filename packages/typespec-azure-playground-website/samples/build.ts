import type { PlaygroundSample } from "@typespec/playground";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { dirname, join, resolve } from "pathe";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplesSpecsDir = resolve(__dirname, "../../samples/specs");
const outputFile = resolve(__dirname, "dist/samples.ts");

/** Convert a directory name like "data-plane" or "resource-manager" to a display label. */
function formatCategory(dirName: string): string {
  return dirName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface SampleConfig {
  title?: string;
  description?: string;
  directory?: boolean;
}

interface TspConfig {
  emit?: string[];
  linter?: {
    extends?: string[];
  };
}

async function findSampleConfigs(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findSampleConfigs(fullPath)));
    } else if (entry.name === "sample-config.yaml") {
      results.push(fullPath);
    }
  }
  return results;
}

/** Find the nearest tspconfig.yaml by walking up the directory tree, stopping at specsDir. */
async function findNearestTspConfig(
  sampleDir: string,
  specsDir: string,
): Promise<TspConfig | undefined> {
  let dir = sampleDir;
  while (dir.startsWith(specsDir)) {
    const configPath = join(dir, "tspconfig.yaml");
    try {
      const content = await readFile(configPath, "utf-8");
      return parseYaml(content) as TspConfig;
    } catch {
      // No config at this level, walk up
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

async function findTspFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findTspFiles(fullPath)));
    } else if (entry.name.endsWith(".tsp")) {
      results.push(fullPath);
    }
  }
  return results;
}

// Discover all sample-config.yaml files
const configPaths = (await findSampleConfigs(samplesSpecsDir)).sort();

const samples: Record<string, PlaygroundSample> = {};

for (const configPath of configPaths) {
  const sampleDir = dirname(configPath);
  const configContent = await readFile(configPath, "utf-8");
  const config = parseYaml(configContent) as SampleConfig;

  // Skip directory-only configs
  if (config.directory === true) continue;

  if (!config.title) {
    throw new Error(`Sample config at ${configPath} is missing title field.`);
  }

  // Find the nearest tspconfig.yaml for compiler options
  const tspConfig = await findNearestTspConfig(sampleDir, samplesSpecsDir);

  // Derive compiler options from tspconfig
  let compilerOptions: { linterRuleSet: { extends: string[] } } | undefined;
  if (tspConfig?.linter?.extends) {
    compilerOptions = {
      linterRuleSet: { extends: tspConfig.linter.extends },
    };
  }

  // Derive preferred emitter from tspconfig
  const preferredEmitter = tspConfig?.emit?.[0] ?? "@azure-tools/typespec-autorest";

  // Read all .tsp files for this sample
  const tspFiles = (await findTspFiles(sampleDir)).sort();
  const mainTspPath = join(sampleDir, "main.tsp");

  if (!tspFiles.includes(mainTspPath)) {
    throw new Error(`Sample at ${sampleDir} is missing main.tsp file.`);
  }

  // Skip multi-file samples — the playground only supports single-file editing
  if (tspFiles.length > 1) continue;

  const content = await readFile(mainTspPath, "utf-8");

  // Compute relative path from specs dir for the sample identifier
  const sampleRelPath = sampleDir.slice(samplesSpecsDir.length + 1);

  // Derive category from directory structure (e.g., "data-plane/widget-manager" → "Data Plane")
  const pathParts = sampleRelPath.split("/");
  const category = formatCategory(pathParts[0]);

  samples[config.title] = {
    filename: `../samples/specs/${sampleRelPath}/main.tsp`,
    content,
    preferredEmitter,
    category,
    description: config.description ?? "",
    ...(compilerOptions ? { compilerOptions } : {}),
  };
}

// Write output
await mkdir(dirname(outputFile), { recursive: true });
const output = [
  `import type { PlaygroundSample } from "@typespec/playground";`,
  `const samples: Record<string, PlaygroundSample> = ${JSON.stringify(samples, null, 2)};`,
  `export default samples;`,
].join("\n");
await writeFile(outputFile, output);
