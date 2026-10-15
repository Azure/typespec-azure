/* eslint-disable no-console */
import { loadSpectorConfig, resolveSpecs } from "@azure-tools/spector-runner";
import { fileURLToPath } from "url";
import { runTypespec } from "./run.ts";

// Spec selection lives in the opt-in `spector.config.yaml` at the package root
// (see Azure/typespec-azure#4997), parsed by the shared @azure-tools/spector-runner
// package. Each enabled spec resolves to an input path plus optional emitter
// metadata: `outputPath` (the generated folder, defaults to the spec path) and
// `debug` (only run under --debug). This reconstructs the legacy list shape so
// the rest of this script is unchanged.
const configPath = fileURLToPath(new URL("../../spector.config.yaml", import.meta.url));
const azureModularTsps = resolveSpecs(loadSpectorConfig(configPath)).map(({ path, options }) => ({
  inputPath: path,
  outputPath: typeof options.outputPath === "string" ? options.outputPath : path,
  debug: options.debug === true,
}));

async function generateTypeSpecs(isDebugging, pathFilter, phase = "all") {
  let list = azureModularTsps;

  if (pathFilter) {
    list = list.filter((tsp) => tsp.outputPath === pathFilter);
  }

  const maxConcurrentWorkers = 4;
  let activePromises = [];
  for (const tsp of list) {
    if (isDebugging === true && tsp.debug !== true) {
      continue;
    }
    const generatePromise = runTypespec(tsp, phase)
      .then((result) => {
        activePromises = activePromises.filter((p) => p !== generatePromise);
        return result;
      })
      .catch((error) => {
        activePromises = activePromises.filter((p) => p !== generatePromise);
        throw error;
      });

    activePromises.push(generatePromise);

    if (activePromises.length >= maxConcurrentWorkers) {
      await Promise.race(activePromises);
    }
  }

  await Promise.allSettled(activePromises);
}

async function main() {
  const isDebugging = process.argv.indexOf("--debug") !== -1;
  const nameFilter = process.argv.filter((s) => s.startsWith("--filter="));
  const phaseOptions = process.argv.filter((s) => s.startsWith("--phase="));
  const filter = nameFilter[0]?.split("=")[1];
  const phase = phaseOptions[0]?.split("=")[1] ?? "all";
  await generateTypeSpecs(isDebugging, filter, phase);
}

let exitCode = 0;
try {
  console.time("generate-spector");
  await main();
} catch (e) {
  console.error(e);
  exitCode = 1;
} finally {
  console.timeEnd("generate-spector");
  process.exit(exitCode);
}
