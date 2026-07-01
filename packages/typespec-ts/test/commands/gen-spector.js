/* eslint-disable no-console */
import { runTypespec } from "./run.ts";
import { azureModularTsps } from "./spector-list.js";

async function generateTypeSpecs(isDebugging, pathFilter, phase = "all", overrides = {}) {
  let list = azureModularTsps;

  if (pathFilter) {
    list = list.filter(
      (tsp) => tsp.outputPath === pathFilter || tsp.outputPath.includes(pathFilter),
    );
  }

  const maxConcurrentWorkers = 4;
  let activePromises = [];
  for (const tsp of list) {
    if (isDebugging === true && tsp.debug !== true) {
      continue;
    }
    const generatePromise = runTypespec(tsp, phase, overrides)
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

// Parse `--key=value` style options from argv.
function argValue(prefix) {
  const hit = process.argv.find((s) => s.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const isDebugging = process.argv.indexOf("--debug") !== -1;
  const filter = argValue("--filter=");
  const phase = argValue("--phase=") ?? "all";
  // Overrides consumed by the eng/emitter-diff tool (ignored by normal runs):
  //   --emitter-dir=<dir>  run this emitter build instead of the workspace one
  //   --output-dir=<dir>   write generated output under this base dir
  const overrides = {
    emitterDir: argValue("--emitter-dir="),
    outputBase: argValue("--output-dir="),
  };
  await generateTypeSpecs(isDebugging, filter, phase, overrides);
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
