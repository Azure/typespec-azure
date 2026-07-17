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
import type { PackageSize, SizeReport } from "./measure.js";
import { formatBytes, formatDelta, formatPercent } from "./utils.js";

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
  const changed = rows.filter((r) => r.packedDelta !== 0 || r.unpackedDelta !== 0);
  const unchanged = rows.filter((r) => r.packedDelta === 0 && r.unpackedDelta === 0);

  const lines: string[] = [];
  lines.push(COMMENT_MARKER);
  lines.push("## 📦 Package size report");
  lines.push("");

  if (rows.length === 0) {
    lines.push("_No publishable packages were found._");
    return lines.join("\n");
  }

  if (changed.length === 0) {
    lines.push("No package size changes detected compared to the base branch. ✅");
  } else {
    lines.push(
      `${changed.length} package${changed.length === 1 ? "" : "s"} changed size compared to the base branch.`,
    );
    lines.push("");
    lines.push(...renderTable(changed));
  }
  lines.push("");

  if (unchanged.length > 0) {
    lines.push("<details>");
    lines.push(`<summary>${unchanged.length} unchanged package(s)</summary>`);
    lines.push("");
    lines.push(...renderTable(unchanged));
    lines.push("</details>");
    lines.push("");
  }

  lines.push(
    "<sub>Packed = gzipped `.tgz` published to npm. Unpacked = total extracted size. 🆕 added, 🗑️ removed.</sub>",
  );
  return lines.join("\n");
}

function renderTable(rows: Row[]): string[] {
  const lines: string[] = [];
  lines.push("| Package | Packed (base → head) | Δ Packed | Unpacked (base → head) | Δ Unpacked |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of rows) {
    const packed = `${sizeCell(row.base)} → ${sizeCell(row.head)}`;
    const unpacked = `${unpackedCell(row.base)} → ${unpackedCell(row.head)}`;
    const packedDelta =
      row.packedDelta === 0
        ? "—"
        : `${formatDelta(row.packedDelta)} (${formatPercent(row.base?.size ?? 0, row.head?.size ?? 0)})`;
    const unpackedDelta =
      row.unpackedDelta === 0
        ? "—"
        : `${formatDelta(row.unpackedDelta)} (${formatPercent(row.base?.unpackedSize ?? 0, row.head?.unpackedSize ?? 0)})`;
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

await main();
