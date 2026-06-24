/* eslint-disable no-console */
import { compile, NodeHost, resolveCompilerOptions } from "@typespec/compiler";
import { join } from "path";
import type { Stats } from "./types.js";

async function compileSpec(specDir: string): Promise<Stats> {
  const mainFile = join(specDir, "main.tsp");
  const [options, diagnostics] = await resolveCompilerOptions(NodeHost, {
    entrypoint: mainFile,
    cwd: specDir,
  });
  if (diagnostics.length > 0) {
    const msgs = diagnostics.map((d: any) => `  ${d.message}`).join("\n");
    console.warn(`Warnings resolving options for ${specDir}:\n${msgs}`);
  }

  const program = await compile(NodeHost, mainFile, {
    ...options,
    outputDir: join(specDir, "tsp-output"),
  });

  if (program.hasError()) {
    const errorDiags = program.diagnostics
      .filter((d: any) => d.severity === "error")
      .map((d: any) => `  ${d.message}`)
      .join("\n");
    throw new Error(`Compilation failed for ${specDir}:\n${errorDiags}`);
  }

  const stats = (program as any).stats as Stats;
  stats.runtime.total =
    (stats.runtime.loader ?? 0) +
    (stats.runtime.resolver ?? 0) +
    (stats.runtime.checker ?? 0) +
    (stats.runtime.validation?.total ?? 0) +
    (stats.runtime.linter?.total ?? 0);
  return stats;
}

async function main() {
  const specDir = process.argv[2];
  if (!specDir) {
    throw new Error("Missing spec directory");
  }
  const stats = await compileSpec(specDir);
  process.stdout.write(JSON.stringify(stats));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
