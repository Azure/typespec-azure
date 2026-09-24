/* eslint-disable no-console */
import { compile, formatDiagnostic, NodeHost, resolveCompilerOptions } from "@typespec/compiler";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "path";
import { validateEmitterStats } from "./compile.js";
import type { Stats } from "./types.js";

async function compileSpec(specDir: string): Promise<Stats> {
  const mainFile = join(specDir, "main.tsp");
  const [options, diagnostics] = await resolveCompilerOptions(NodeHost, {
    entrypoint: mainFile,
    cwd: specDir,
  });
  if (diagnostics.length > 0) {
    const msgs = diagnostics.map((d) => formatDiagnostic(d)).join("\n");
    if (diagnostics.some((d) => d.severity === "error")) {
      throw new Error(`Invalid compiler options for ${specDir}:\n${msgs}`);
    }
    process.stderr.write(`Warnings resolving options for ${specDir}:\n${msgs}\n`);
  }

  // Go otherwise reports only a warning and skips its post-generation work.
  if (options.emit?.includes("@azure-tools/typespec-go")) {
    try {
      execFileSync("go", ["version"], { stdio: "pipe" });
    } catch (cause) {
      throw new Error("Full Go benchmarks require the Go toolchain on PATH.", { cause });
    }
  }

  const program = await compile(NodeHost, mainFile, {
    ...options,
    outputDir: join(specDir, "tsp-output"),
  });

  if (program.hasError()) {
    const errorDiags = program.diagnostics
      .filter((d) => d.severity === "error")
      .map((d) => formatDiagnostic(d))
      .join("\n");
    throw new Error(`Compilation failed for ${specDir}:\n${errorDiags}`);
  }

  // The compiler strips its internal Stats property from the published declarations.
  const stats = (program as typeof program & { stats: Stats }).stats;
  validateEmitterStats(stats, options.emit ?? []);
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
  writeFileSync(3, JSON.stringify(stats));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
