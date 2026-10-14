import { runMain } from "../../../../core/eng/common/scripts/node-process.ts";
import { withSpectorServer } from "../../../../core/eng/common/scripts/spector-server.ts";
import { generateAndRun } from "./generate-and-run.ts";
import { spectorPort, spectorServerArgs } from "./start-test-server.ts";

await runMain((signal) =>
  withSpectorServer(spectorServerArgs(), spectorPort, generateAndRun, signal),
);
