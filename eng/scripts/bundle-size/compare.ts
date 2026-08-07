// Compare two package-size reports (base vs head) produced by `measure.ts` and render
// a markdown summary table of the tarball size changes.
//
// Usage:
//   tsx eng/scripts/bundle-size/compare.ts --base <base.json> --head <head.json> --out <comment.md>
//
// The rendered markdown is written to --out and, when running in GitHub Actions, also
// appended to the job summary ($GITHUB_STEP_SUMMARY).

import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { pathToFileURL } from "url";
import type { PackageSize, SizeReport } from "./measure.ts";
import {
  changeIndicator,
  formatBytes,
  formatDelta,
  formatPercent,
  isNotableSizeChange,
  LEGEND,
} from "./utils.ts";

/** Hidden marker so the comment workflow can find & update its own comment. */
export const COMMENT_MARKER = "<!-- bundle-size-report -->";

interface Row {
  name: string;
  base?: PackageSize;
  head?: PackageSize;
  packedDelta: number;
  unpackedDelta: number;
}

export function buildRows(base: SizeReport, head: SizeReport): Row[] {
  const names = new Set([...Object.keys(base), ...Object.keys(head)]);
  const rows: Row[] = [];
  for (const name of names) {
    const b = base[name];
    const h = head[name];
    rows.push({
      name,
      base: b,
      head: h,
      packedDelta: (h?.size ?? 0) - (b?.size ?? 0),
      unpackedDelta: (h?.unpackedSize ?? 0) - (b?.unpackedSize ?? 0),
    });
  }
  // Sort by largest absolute packed change first, then name.
  rows.sort(
    (a, b) => Math.abs(b.packedDelta) - Math.abs(a.packedDelta) || a.name.localeCompare(b.name),
  );
  return rows;
}

function statusLabel(row: Row): string {
  if (!row.base && row.head) return " 🆕";
  if (row.base && !row.head) return " 🗑️";
  return "";
}

function sizeCell(size: PackageSize | undefined): string {
  return size ? formatBytes(size.size) : "—";
}

function unpackedCell(size: PackageSize | undefined): string {
  return size ? formatBytes(size.unpackedSize) : "—";
}

export function renderMarkdown(base: SizeReport, head: SizeReport): string {
  const rows = buildRows(base, head);
  const notable = rows.filter(isNotableRow);
  const rest = rows.filter((row) => !isNotableRow(row));

  const lines: string[] = [];
  lines.push(COMMENT_MARKER);
  lines.push("## 📦 Package size report");
  lines.push("");

  if (rows.length === 0) {
    lines.push("_No publishable packages were found._");
    return lines.join("\n");
  }

  if (notable.length === 0) {
    lines.push("✅ No notable package size changes compared to the base branch.");
  } else {
    const totalBase = sum(rows, (r) => r.base?.size ?? 0);
    const totalHead = sum(rows, (r) => r.head?.size ?? 0);
    lines.push(
      `${notable.length} package${notable.length === 1 ? "" : "s"} changed size, ` +
        `${deltaCell(totalHead - totalBase, totalBase, totalHead)} packed overall.`,
    );
    lines.push("");
    lines.push(...renderTable(notable));
  }
  lines.push("");

  if (rest.length > 0) {
    lines.push("<details>");
    lines.push(`<summary>${rest.length} package(s) with no notable change</summary>`);
    lines.push("");
    lines.push(...renderTable(rest));
    lines.push("</details>");
    lines.push("");
  }

  lines.push(
    "<sub>Packed = gzipped `.tgz` published to npm. Unpacked = total extracted size. " +
      "🆕 added, 🗑️ removed. Packages from the `core/` submodule are not included.<br>" +
      LEGEND +
      "</sub>",
  );
  return lines.join("\n");
}

/**
 * Whether a package moved enough to be worth a reviewer's attention.
 *
 * Anything below the thresholds is grouped away: rebuilding the same sources does not always
 * produce a byte-identical tarball. `@azure-tools/typespec-java`, for instance, ships a Maven
 * jar whose zip entries carry wall-clock build timestamps, so the head and base builds compress
 * to slightly different sizes even when nothing about the package changed.
 */
function isNotableRow(row: Row): boolean {
  return (
    isNotableSizeChange(row.packedDelta, row.base?.size ?? 0) ||
    isNotableSizeChange(row.unpackedDelta, row.base?.unpackedSize ?? 0)
  );
}

function sum(rows: Row[], select: (row: Row) => number): number {
  return rows.reduce((total, row) => total + select(row), 0);
}

/** A signed delta with its percentage and, when notable, a 🔴/🟢 marker. */
function deltaCell(delta: number, base: number, head: number, marker = true): string {
  if (delta === 0) {
    return "—";
  }
  const indicator = marker ? changeIndicator(delta, base) : "";
  return `${formatDelta(delta)} (${formatPercent(base, head)}) ${indicator}`.trim();
}

function renderTable(rows: Row[]): string[] {
  const lines: string[] = [];
  lines.push("| Package | Packed (base → head) | Δ Packed | Unpacked (base → head) | Δ Unpacked |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of rows) {
    const packed = `${sizeCell(row.base)} → ${sizeCell(row.head)}`;
    const unpacked = `${unpackedCell(row.base)} → ${unpackedCell(row.head)}`;
    // An added or removed package is already called out by 🆕/🗑️; a marker would just be noise.
    const marker = Boolean(row.base && row.head);
    const packedDelta = deltaCell(
      row.packedDelta,
      row.base?.size ?? 0,
      row.head?.size ?? 0,
      marker,
    );
    const unpackedDelta = deltaCell(
      row.unpackedDelta,
      row.base?.unpackedSize ?? 0,
      row.head?.unpackedSize ?? 0,
      marker,
    );
    lines.push(
      `| \`${row.name}\`${statusLabel(row)} | ${packed} | ${packedDelta} | ${unpacked} | ${unpackedDelta} |`,
    );
  }
  return lines;
}

async function readReport(path: string): Promise<SizeReport> {
  return JSON.parse(await readFile(path, "utf-8")) as SizeReport;
}

function parseArgs(argv: string[]): { base: string; head: string; out: string } {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    if (i === -1 || !argv[i + 1]) {
      throw new Error(`Missing required argument: ${flag} <file>`);
    }
    return argv[i + 1];
  };
  return { base: get("--base"), head: get("--head"), out: get("--out") };
}

async function main() {
  const { base, head, out } = parseArgs(process.argv.slice(2));
  const [baseReport, headReport] = await Promise.all([readReport(base), readReport(head)]);
  const markdown = renderMarkdown(baseReport, headReport);

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
  }
  // eslint-disable-next-line no-console
  console.log(markdown);
}

// Only run as a CLI, so the rendering helpers above can be imported from tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
