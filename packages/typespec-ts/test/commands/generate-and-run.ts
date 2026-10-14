import {
  resolveNodeBin,
  runMain,
  runNode,
  runParallel,
} from "../../../../core/eng/common/scripts/node-process.ts";
import { spectorPort } from "./start-test-server.ts";

export async function generateAndRun(signal: AbortSignal): Promise<void> {
  await runNode(["./test/commands/gen-spector.js", "--phase=client"], signal);
  await runParallel(
    [
      [resolveNodeBin("vitest", "vitest"), "run", "--project", "integration-azure-modular"],
      ["./test/commands/gen-spector.js", "--phase=declarations"],
    ],
    signal,
  );
}

if (import.meta.main) {
  await runMain(async (signal) => {
    try {
      await generateAndRun(signal);
    } finally {
      await runNode([
        resolveNodeBin("@typespec/spector", "tsp-spector"),
        "server",
        "stop",
        "--port",
        String(spectorPort),
      ]);
    }
  });
}
