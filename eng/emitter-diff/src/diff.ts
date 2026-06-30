/**
 * Diff engine. One canonical unified patch (`git diff --no-index`) is the
 * source of truth; it is then rendered for whichever environment is in use:
 *  - terminal: colored patch + summary
 *  - local `--open`: VS Code folder diff
 *  - CI `--html`: rendered via diff2html (optional dependency, lazily loaded)
 */
import { writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

import type { Logger } from "./types.ts";
import { color, run } from "./util.ts";

export interface DiffResult {
  /** The unified patch text (empty when there are no differences). */
  patch: string;
  /** True when the two trees differ. */
  hasChanges: boolean;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * Produce a unified patch between two directories using git's directory diff,
 * which works outside a repo and ignores index state.
 */
export async function diffDirs(
  baselineDir: string,
  headDir: string,
  log: Logger,
): Promise<DiffResult> {
  log.step("Diffing generated output");

  // When both dirs share a parent, diff with relative names from that parent so
  // the patch carries clean, comparable paths instead of absolute Windows ones.
  const parent = dirname(baselineDir);
  const sharesParent = dirname(headDir) === parent;
  const baseName = basename(baselineDir);
  const headName = basename(headDir);
  const args = sharesParent
    ? ["diff", "--no-index", "--no-color", "--", baseName, headName]
    : ["diff", "--no-index", "--no-color", "--", baselineDir, headDir];

  // `git diff --no-index` exits 1 when there are differences — that is not an error.
  const result = await run("git", args, { cwd: sharesParent ? parent : undefined });
  if (result.code > 1) {
    throw new Error(`git diff failed (${result.code}): ${result.stderr}`);
  }

  // Strip the baseline/head root segments so each file shows as a single
  // modification (a/pkg/x vs b/pkg/x) rather than a rename across roots.
  const patch = sharesParent
    ? result.stdout.replace(
        new RegExp(`([ab])/(?:${escapeRe(baseName)}|${escapeRe(headName)})/`, "g"),
        "$1/",
      )
    : result.stdout;

  const stats = summarize(patch);
  return { patch, hasChanges: patch.trim().length > 0, ...stats };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function summarize(patch: string): {
  filesChanged: number;
  insertions: number;
  deletions: number;
} {
  let filesChanged = 0;
  let insertions = 0;
  let deletions = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git") || line.startsWith("diff --no-index")) filesChanged++;
    else if (line.startsWith("+") && !line.startsWith("+++")) insertions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }
  return { filesChanged, insertions, deletions };
}

/** Print a colorized patch and a one-line summary to the terminal. */
export function printDiff(diff: DiffResult, log: Logger): void {
  if (!diff.hasChanges) {
    log.success("No differences between baseline and head output.");
    return;
  }
  for (const line of diff.patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) process.stdout.write(color.green(line) + "\n");
    else if (line.startsWith("-") && !line.startsWith("---")) process.stdout.write(color.red(line) + "\n");
    else if (line.startsWith("@@")) process.stdout.write(color.cyan(line) + "\n");
    else if (line.startsWith("diff ") || line.startsWith("index "))
      process.stdout.write(color.bold(line) + "\n");
    else process.stdout.write(line + "\n");
  }
  printSummary(diff, log);
}

export function printSummary(diff: DiffResult, log: Logger): void {
  log.info(
    `${color.bold("Diff summary:")} ${diff.filesChanged} file(s), ` +
      `${color.green("+" + diff.insertions)} / ${color.red("-" + diff.deletions)}`,
  );
}

/**
 * Render the patch to a self-contained HTML file via diff2html. diff2html is an
 * optional dependency loaded lazily so the core runs without it installed.
 */
export async function writeHtml(
  diff: DiffResult,
  outFile: string,
  log: Logger,
): Promise<void> {
  let html: (typeof import("diff2html"))["html"];
  try {
    ({ html } = await import("diff2html"));
  } catch {
    throw new Error(
      "Rendering --html requires the 'diff2html' package. Install it in eng/emitter-diff " +
        "(it is declared as a dependency) or run with `pnpm` so it is available.",
    );
  }
  const body = html(diff.patch, {
    drawFileList: true,
    matching: "lines",
    outputFormat: "side-by-side",
  });
  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Emitter diff</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
<style>body{margin:0;font-family:system-ui,sans-serif}.summary{padding:12px 16px;background:#f6f8fa;border-bottom:1px solid #d0d7de}</style>
</head>
<body>
<div class="summary"><strong>Emitter diff</strong> — ${diff.filesChanged} file(s), +${diff.insertions} / -${diff.deletions}</div>
${body}
</body>
</html>`;
  writeFileSync(outFile, doc, "utf8");
  log.success(`Wrote HTML diff to ${outFile}`);
}

/** Open a folder comparison in VS Code (`code --diff <baseline> <head>`). */
export async function openInVsCode(
  baselineDir: string,
  headDir: string,
  log: Logger,
): Promise<void> {
  log.step("Opening diff in VS Code");
  const result = await run("code", ["--diff", baselineDir, headDir]);
  if (result.code !== 0) {
    log.warn(
      "Could not launch VS Code (`code` not on PATH?). " +
        `Compare manually: ${baselineDir} vs ${headDir}`,
    );
  }
}
