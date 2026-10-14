import { mkdirSync } from "node:fs";
import { run } from "../../../../core/eng/common/scripts/run.ts";

export const spectorPort = 3002;

export function spectorServerArgs(): string[] {
  mkdirSync("coverage", { recursive: true });
  return [
    "./node_modules/@azure-tools/azure-http-specs/specs",
    "./node_modules/@typespec/http-specs/specs",
    "--coverageFile",
    "./coverage/spector-coverage-typescript-azure.json",
  ];
}

if (import.meta.main) {
  await run("tsp-spector", ["serve", ...spectorServerArgs(), "--port", String(spectorPort)]);
}
