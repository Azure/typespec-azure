/* eslint-disable no-console */
import { writeFileSync } from "node:fs";
import type { CompilationMode } from "./compile.js";
import { compileInProcess } from "./compiler.js";

async function main() {
  const specDir = process.argv[2];
  if (!specDir) throw new Error("Missing spec directory");
  const mode: CompilationMode = JSON.parse(process.argv[3] ?? '{"kind":"compiler"}');
  if (mode.kind !== "compiler" && mode.kind !== "emitter")
    throw new Error("Invalid compilation mode");
  writeFileSync(3, JSON.stringify(await compileInProcess(specDir, mode)));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
