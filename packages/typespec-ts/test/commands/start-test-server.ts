import { mkdirSync } from "node:fs";
import {
  resolveNodeBin,
  runMain,
  runNode,
} from "../../../../core/eng/common/scripts/node-process.ts";

export const spectorPort = 3002;

export function spectorServerArgs(): string[] {
  mkdirSync("coverage", { recursive: true });
  return [
    resolveNodeBin("@typespec/spector", "tsp-spector"),
    "serve",
    "./node_modules/@azure-tools/azure-http-specs/specs",
    "./node_modules/@typespec/http-specs/specs",
    "--port",
    String(spectorPort),
    "--coverageFile",
    "./coverage/spector-coverage-typescript-azure.json",
  ];
}

if (import.meta.main) {
  await runMain((signal) => runNode(spectorServerArgs(), signal));
}
