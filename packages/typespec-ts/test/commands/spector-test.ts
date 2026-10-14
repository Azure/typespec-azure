import { withSpectorServer } from "../../../../core/eng/common/scripts/spector-server.ts";
import { generateAndRun } from "./generate-and-run.ts";
import { spectorPort, spectorServerArgs } from "./start-test-server.ts";

await withSpectorServer(spectorServerArgs(), spectorPort, generateAndRun);
