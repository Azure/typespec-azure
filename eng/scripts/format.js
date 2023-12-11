// @ts-check
import { runDotnetFormat } from "../../core/packages/internal-build-utils/dist/src/index.js";
import { runPrettier } from "./helpers.js";
runPrettier("--write");
await runDotnetFormat();
