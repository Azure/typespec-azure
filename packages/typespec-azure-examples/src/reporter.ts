import { relative } from "path";
import pc from "picocolors";
import type { ExampleDiagnostic } from "./types.js";

/** Format a set of diagnostics for terminal output, grouped by file. */
export function formatDiagnostics(
  diagnostics: readonly ExampleDiagnostic[],
  baseDir?: string,
): string {
  const lines: string[] = [];
  for (const d of diagnostics) {
    const file = baseDir ? relative(baseDir, d.file) : d.file;
    const location = d.line !== undefined ? `${file}:${d.line}:${d.col ?? 1}` : file;
    const label = d.severity === "error" ? pc.red("error") : pc.yellow("warning");
    lines.push(`${pc.cyan(location)} - ${label} ${pc.gray(d.code)}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Format a one-line summary of the diagnostics. */
export function formatSummary(diagnostics: readonly ExampleDiagnostic[]): string {
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  if (errors === 0 && warnings === 0) return pc.green("✔ Examples are valid");
  const parts: string[] = [];
  if (errors > 0) parts.push(pc.red(`${errors} error${errors === 1 ? "" : "s"}`));
  if (warnings > 0) parts.push(pc.yellow(`${warnings} warning${warnings === 1 ? "" : "s"}`));
  return `Found ${parts.join(" and ")}`;
}
