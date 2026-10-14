import { run } from "../../../../core/eng/common/scripts/run.ts";
import { spectorPort } from "./start-test-server.ts";

export async function generateAndRun(): Promise<void> {
  await run(process.execPath, ["./test/commands/gen-spector.js", "--phase=client"]);
  const tasks = [
    run("vitest", ["run", "--project", "integration-azure-modular"]),
    run(process.execPath, ["./test/commands/gen-spector.js", "--phase=declarations"]),
  ];
  try {
    await Promise.all(tasks);
  } finally {
    for (const task of tasks) task.kill();
    await Promise.allSettled(tasks);
  }
}

if (import.meta.main) {
  try {
    await generateAndRun();
  } finally {
    await run("tsp-spector", ["server", "stop", "--port", String(spectorPort)]);
  }
}
