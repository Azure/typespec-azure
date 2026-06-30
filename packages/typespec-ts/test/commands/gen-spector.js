/* eslint-disable no-console */
import { runTypespec } from "./run.ts";
import { azureModularTsps } from "./spector-list.js";

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
