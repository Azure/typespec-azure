/* eslint-disable no-console */
/**
 * Renders an HTML diff between the **assets baseline** (the last accepted
 * regeneration output, restored from the assets repo) and the **current**
 * `tests/generated` output (produced by `npm run regenerate` beforehand).
 *
 * Output (default `temp/diff-site/`):
 *   - index.html      A self-contained, side-by-side HTML diff (diff2html).
 *   - summary.json    { changed, filesChanged, additions, deletions } for the
 *                     PR-comment step to consume.
 *
 * Restoring the baseline is an anonymous clone of the public assets repo, so
 * this needs no token. If assets.json has no Tag yet (not bootstrapped), the
 * whole current output is treated as "added".
 *
 * Usage:
 *   tsx ./eng/scripts/ci/render-diff.ts [--output <dir>] [--generated <dir>] [--title <t>]
 */

import { execFileSync, execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { cp, mkdtemp } from "fs/promises";
import { createRequire } from "module";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import pc from "picocolors";
import { fileURLToPath, pathToFileURL } from "url";
import { parseArgs } from "util";

import { FLAVORS, readAssetsConfig, restoreFullBaseline } from "./assets.js";

// diff2html is CommonJS; load via createRequire for ESM.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { html: diff2html } = require("diff2html") as typeof import("diff2html");

const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    output: { type: "string", short: "o" },
    generated: { type: "string", short: "g" },
    title: { type: "string", short: "t" },
    open: { type: "boolean" },
    vscode: { type: "boolean" },
    max: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx render-diff.ts [options]

Renders an HTML diff of the current tests/generated output vs the assets baseline.

${pc.bold("Options:")}
  -o, --output <dir>     Output directory (default: temp/diff-site).
  -g, --generated <dir>  Current generated dir (default: tests/generated).
  -t, --title <text>     Title shown on the diff page.
      --open             Open the rendered diff in your default browser.
      --vscode           Open each changed file as a native VS Code editor diff
                         (baseline vs current) and keep both trees on disk at
                         temp/diff-trees/ for use with a folder-compare extension.
      --max <n>          Max number of files to open in VS Code (default 40).
  -h, --help             Show this help.
`);
  process.exit(0);
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "../../../");
const GENERATED_DIR = argv.values.generated
  ? resolve(argv.values.generated)
  : resolve(PACKAGE_ROOT, "tests/generated");
const OUTPUT_DIR = argv.values.output
  ? resolve(argv.values.output)
  : resolve(PACKAGE_ROOT, "temp/diff-site");
const TITLE = argv.values.title ?? "Python emitter — generated test diff";

// Each changed file is rendered as its own page, so we never build one giant
// HTML string (which throws `RangeError: Invalid string length` past ~512MB).
// A single file whose diff exceeds this is shown as a raw <pre> instead of a
// rich side-by-side render, to bound per-page memory/size.
const MAX_FILE_DIFF_BYTES = 2 * 1024 * 1024;

interface DiffSummary {
  changed: boolean;
  filesChanged: number;
  additions: number;
  deletions: number;
  baselineTag: string;
  note?: string;
}

function git(args: string[], cwd: string, allowFail = false): string {
  try {
    return execFileSync("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (err) {
    if (allowFail) {
      const e = err as { stdout?: string };
      return e.stdout ?? "";
    }
    throw err;
  }
}

/** Removes carriage returns so diff2html doesn't render literal `^M` markers. */
function stripCr(text: string): string {
  return text.replace(/\r/g, "");
}

/**
 * Recursively rewrites every text file under `dir` with all `\r` bytes removed,
 * so line endings are pure LF. The baseline may have been generated on Windows,
 * where Python writing `\r\n` to a text-mode file yields `\r\r\n` (double CR);
 * `git diff --ignore-cr-at-eol` only ignores a *single* trailing CR, so without
 * this those lines show as spurious changes. Normalizing both trees to LF makes
 * the comparison truly line-ending agnostic. Files containing a NUL byte are
 * treated as binary and left untouched.
 */
function normalizeEol(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      normalizeEol(full);
    } else if (entry.isFile()) {
      const buf = readFileSync(full);
      if (buf.includes(0)) continue; // binary
      if (buf.includes(0x0d)) {
        writeFileSync(full, buf.toString("utf8").replace(/\r/g, ""));
      }
    }
  }
}

/**
 * Removes transient codegen handoff files (`.tsp-codegen-*.json`) from a tree.
 * These are written by the TypeSpec emit step for the Python batch step; they
 * embed absolute machine-local paths and are not real generated output, so they
 * would otherwise show up as noise in the diff.
 */
function pruneIntermediates(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      pruneIntermediates(full);
    } else if (entry.isFile() && entry.name.startsWith(".tsp-codegen-")) {
      rmSync(full, { force: true });
    }
  }
}

/** Parses `git diff --numstat` output into aggregate counts. */
function parseNumstat(numstat: string): { files: number; additions: number; deletions: number } {
  let files = 0;
  let additions = 0;
  let deletions = 0;
  for (const line of numstat.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [add, del] = trimmed.split("\t");
    files += 1;
    // Binary files report "-" for counts.
    if (add !== "-") additions += Number(add) || 0;
    if (del !== "-") deletions += Number(del) || 0;
  }
  return { files, additions, deletions };
}

async function main(): Promise<void> {
  // Validate current output exists.
  for (const flavor of FLAVORS) {
    if (!existsSync(join(GENERATED_DIR, flavor))) {
      console.error(
        pc.red(
          `Missing ${join(GENERATED_DIR, flavor)}. Run "npm run regenerate" before render-diff.`,
        ),
      );
      process.exit(1);
    }
  }

  const config = readAssetsConfig(PACKAGE_ROOT);
  const baselineTag = config?.tag ?? "";

  const workDir = await mkdtemp(join(tmpdir(), "typespec-diff-"));
  const baselineDir = join(workDir, "baseline");
  const currentDir = join(workDir, "current");

  try {
    // "current" = freshly regenerated output.
    await cp(GENERATED_DIR, currentDir, { recursive: true });

    // "baseline" = last accepted output from the assets repo (empty if no tag).
    mkdirSync(baselineDir, { recursive: true });
    let note: string | undefined;
    if (config && config.tag) {
      console.log(pc.cyan(`Restoring baseline ${config.assetsRepo}@${config.tag}...`));
      await restoreFullBaseline(config, baselineDir);
    } else {
      note =
        "No baseline tag is configured in assets.json yet; the entire current output is shown as added.";
      console.warn(pc.yellow(note));
    }

    // Normalize line endings to LF on both sides so EOL artifacts (e.g. a
    // Windows-generated baseline with `\r\r\n`) don't masquerade as real diffs.
    normalizeEol(currentDir);
    normalizeEol(baselineDir);

    // Drop transient codegen handoff files so they never appear in the diff.
    pruneIntermediates(currentDir);
    pruneIntermediates(baselineDir);

    // git diff --no-index returns exit code 1 when there are differences.
    // --ignore-cr-at-eol makes the diff line-ending agnostic: the baseline may
    // have been pushed from Windows (CRLF) while CI regenerates on Linux (LF),
    // and without this every line shows as changed (pure line-ending noise).
    const diffText = stripCr(
      git(
        [
          "-c",
          "core.quotepath=false",
          "diff",
          "--no-index",
          "--no-color",
          "--ignore-cr-at-eol",
          "--",
          "baseline",
          "current",
        ],
        workDir,
        true,
      ),
    );
    const numstat = git(
      [
        "-c",
        "core.quotepath=false",
        "diff",
        "--no-index",
        "--numstat",
        "--ignore-cr-at-eol",
        "--",
        "baseline",
        "current",
      ],
      workDir,
      true,
    );
    const counts = parseNumstat(numstat);

    const summary: DiffSummary = {
      changed: diffText.trim().length > 0,
      filesChanged: counts.files,
      additions: counts.additions,
      deletions: counts.deletions,
      baselineTag,
      note,
    };

    rmSync(OUTPUT_DIR, { recursive: true, force: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    writeSite(diffText, summary);

    const indexPath = join(OUTPUT_DIR, "index.html");
    console.log(
      pc.green(
        `Diff rendered to ${OUTPUT_DIR} ` +
          `(${summary.filesChanged} files, +${summary.additions}/-${summary.deletions}).`,
      ),
    );
    // Print a clickable file:// URL so the page is one click away locally, and
    // optionally pop it open in the default browser.
    console.log(pc.cyan(`View it at ${pathToFileURL(indexPath).href}`));
    if (argv.values.open) {
      openInBrowser(indexPath);
    }

    // Open the diff natively in VS Code: persist both normalized trees to a
    // stable path and pop a side-by-side editor for each changed file. This is
    // the "VS Code changes" experience — the generated output is git-ignored, so
    // it never shows up in Source Control on its own.
    if (argv.values.vscode) {
      const treesDir = resolve(PACKAGE_ROOT, "temp/diff-trees");
      const baselineOut = join(treesDir, "baseline");
      const currentOut = join(treesDir, "current");
      rmSync(treesDir, { recursive: true, force: true });
      mkdirSync(treesDir, { recursive: true });
      await cp(baselineDir, baselineOut, { recursive: true });
      await cp(currentDir, currentOut, { recursive: true });
      const max = Number(argv.values.max) > 0 ? Number(argv.values.max) : 40;
      openInVscode(diffText, baselineOut, currentOut, summary.filesChanged, max);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** Opens a local file in the OS default browser; never fails the run. */
function openInBrowser(target: string): void {
  try {
    if (process.platform === "win32") {
      // `start` is a cmd builtin; the empty first arg is the window title so a
      // path with spaces isn't mistaken for one.
      execFileSync("cmd", ["/c", "start", "", target], { stdio: "ignore" });
    } else if (process.platform === "darwin") {
      execFileSync("open", [target], { stdio: "ignore" });
    } else {
      execFileSync("xdg-open", [target], { stdio: "ignore" });
    }
  } catch (err) {
    console.warn(pc.yellow(`Could not open a browser automatically: ${err}`));
  }
}

/**
 * Parses `diff --git a/baseline/<rel> b/current/<rel>` header lines to recover
 * the per-file relative paths that changed.
 */
function changedRelPaths(diffText: string): string[] {
  const paths: string[] = [];
  for (const line of diffText.split("\n")) {
    const m = /^diff --git a\/baseline\/(.+?) b\/current\/(.+)$/.exec(line);
    if (m) paths.push(m[2]);
  }
  return paths;
}

/**
 * Opens each changed file as a native VS Code editor diff (`code --diff
 * <baseline> <current>`). Added/removed files (one side missing) are opened on
 * their own. Capped at `max` tabs; for larger sets the persisted folder pair is
 * printed so a folder-compare extension or the HTML page can show the rest.
 */
function openInVscode(
  diffText: string,
  baselineDir: string,
  currentDir: string,
  filesChanged: number,
  max: number,
): void {
  const rels = changedRelPaths(diffText);

  console.log(pc.cyan(`Baseline tree:  ${baselineDir}`));
  console.log(pc.cyan(`Current tree:   ${currentDir}`));

  if (rels.length === 0) {
    console.log(pc.green("No changed files — nothing to open in VS Code."));
    return;
  }

  // `code` is a shell script / .cmd on most platforms, so it must be launched
  // through a shell (Node refuses to execFile a .cmd directly). Compose a single
  // quoted command string so the shell parses paths with spaces correctly
  // (passing an args array with shell:true is deprecated, DEP0190).
  const q = (p: string) => `"${p.replace(/"/g, '\\"')}"`;
  const code = (parts: string[]) => execSync(["code", ...parts].join(" "), { stdio: "ignore" });

  const toOpen = rels.slice(0, max);
  if (rels.length > max) {
    console.warn(
      pc.yellow(
        `${filesChanged} files changed; opening the first ${max} in VS Code. ` +
          `Use --max <n> to open more, the HTML page for all of them, or a ` +
          `folder-compare extension (e.g. "Compare Folders") on the two trees above.`,
      ),
    );
  }

  let opened = 0;
  for (const rel of toOpen) {
    const baseFile = join(baselineDir, rel);
    const curFile = join(currentDir, rel);
    const hasBase = existsSync(baseFile);
    const hasCur = existsSync(curFile);
    try {
      if (hasBase && hasCur) {
        code(["--diff", q(baseFile), q(curFile)]);
      } else if (hasCur) {
        code([q(curFile)]); // added
      } else if (hasBase) {
        code([q(baseFile)]); // removed
      }
      opened += 1;
    } catch (err) {
      console.warn(
        pc.yellow(
          `Could not launch VS Code (is the "code" command on PATH?). ` +
            `Compare the two trees above manually. Details: ${err}`,
        ),
      );
      return;
    }
  }
  console.log(pc.green(`Opened ${opened} file diff(s) in VS Code.`));
}

interface FileDiff {
  /** Display path (baseline/current prefixes stripped). */
  path: string;
  /** Raw unified-diff chunk for just this file. */
  chunk: string;
  additions: number;
  deletions: number;
  status: "added" | "removed" | "modified";
}

/**
 * Rewrites a file chunk's diff header so both sides share the same path.
 *
 * The diff comes from `git diff --no-index baseline current`, so every header
 * reads `a/baseline/<path>` vs `b/current/<path>`. Because those two paths
 * differ only by the temp-dir prefix, diff2html mistakes every file for a
 * RENAME (showing `{baseline → current}`). Stripping the `baseline/`/`current/`
 * prefixes makes old === new path, so it renders as a normal modification.
 */
function normalizeChunkHeader(chunk: string): string {
  const lines = chunk.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("@@")) break; // header is done once hunks begin
    if (line.startsWith("diff --git ")) {
      lines[i] = line.replace(/ a\/baseline\//g, " a/").replace(/ b\/current\//g, " b/");
    } else if (line.startsWith("--- ")) {
      lines[i] = line.replace(/^--- a\/baseline\//, "--- a/");
    } else if (line.startsWith("+++ ")) {
      lines[i] = line.replace(/^\+\+\+ b\/current\//, "+++ b/");
    } else if (line.startsWith("rename from ")) {
      lines[i] = line.replace(/^rename from baseline\//, "rename from ");
    } else if (line.startsWith("rename to ")) {
      lines[i] = line.replace(/^rename to current\//, "rename to ");
    }
  }
  return lines.join("\n");
}

/** Splits a `git diff --no-index` blob into one chunk per file. */
function splitDiffByFile(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  // Each file section begins with a line `diff --git a/... b/...`.
  const sections = diffText.split(/(?=^diff --git )/m).filter((s) => s.startsWith("diff --git "));
  for (const chunk of sections) {
    const lines = chunk.split("\n");
    let oldPath = "";
    let newPath = "";
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.startsWith("--- ")) {
        oldPath = line.slice(4).trim();
      } else if (line.startsWith("+++ ")) {
        newPath = line.slice(4).trim();
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        additions += 1;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions += 1;
      }
    }
    const strip = (p: string): string =>
      p
        .replace(/^["ab]\//, "")
        .replace(/^a\//, "")
        .replace(/^b\//, "")
        .replace(/^baseline\//, "")
        .replace(/^current\//, "");
    const isAdded = oldPath === "/dev/null";
    const isRemoved = newPath === "/dev/null";
    const display = strip(isAdded ? newPath : oldPath) || strip(newPath) || "(unknown)";
    files.push({
      path: display,
      chunk: normalizeChunkHeader(chunk),
      additions,
      deletions,
      status: isAdded ? "added" : isRemoved ? "removed" : "modified",
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

/** Writes the full multi-page diff site to OUTPUT_DIR. */
function writeSite(diffText: string, summary: DiffSummary): void {
  const cssPath = require.resolve("diff2html/bundles/css/diff2html.min.css");
  const sharedCss = readFileSync(cssPath, "utf8") + "\n" + SITE_CSS;
  writeFileSync(join(OUTPUT_DIR, "diff2html.css"), sharedCss);

  if (!summary.changed) {
    writeFileSync(
      join(OUTPUT_DIR, "index.html"),
      pageShell(
        TITLE,
        headerHtml(summary),
        `<div class="no-changes">✅ No differences from the baseline.</div>`,
        ".",
      ),
    );
    return;
  }

  // Keep a full raw diff available for download.
  writeFileSync(join(OUTPUT_DIR, "diff.txt"), diffText);

  const files = splitDiffByFile(diffText);
  const filesDir = join(OUTPUT_DIR, "files");
  mkdirSync(filesDir, { recursive: true });

  const pad = String(files.length).length;
  files.forEach((file, i) => {
    const name = `${String(i + 1).padStart(pad, "0")}.html`;
    writeFileSync(join(filesDir, name), renderFilePage(file, files, i));
  });

  writeFileSync(join(OUTPUT_DIR, "index.html"), renderIndexPage(files, summary, pad));
}

/** Index page: a folder-grouped, searchable tree of all changed files. */
function renderIndexPage(files: FileDiff[], summary: DiffSummary, pad: number): string {
  const root = buildTree(files, pad);
  const tree = renderTreeChildren(root, 0);

  const body = `
<input id="filter" type="search" placeholder="Filter ${files.length} files…" autocomplete="off" />
<div class="treebar">
  <button type="button" id="expand-all">Expand all</button>
  <button type="button" id="collapse-all">Collapse all</button>
  <span class="hint">Grouped by folder · <a href="diff.txt">download the full raw diff</a>.</span>
</div>
<div class="tree">
${tree}
</div>
<script>
  const input = document.getElementById('filter');
  const rows = Array.from(document.querySelectorAll('.file-row'));
  const groups = Array.from(document.querySelectorAll('details.dir'));
  function applyFilter() {
    const q = input.value.toLowerCase();
    for (const r of rows) {
      r.style.display = !q || r.getAttribute('data-path').includes(q) ? '' : 'none';
    }
    for (const g of groups) {
      const visible = g.querySelector('.file-row:not([style*="display: none"])');
      g.style.display = visible ? '' : (q ? 'none' : '');
      if (q && visible) g.open = true;
    }
  }
  input.addEventListener('input', applyFilter);
  document.getElementById('expand-all').addEventListener('click', () => groups.forEach((g) => (g.open = true)));
  document.getElementById('collapse-all').addEventListener('click', () => groups.forEach((g) => (g.open = false)));
</script>`;

  return pageShell(TITLE, headerHtml(summary), body, ".");
}

interface TreeNode {
  dirs: Map<string, TreeNode>;
  files: { name: string; href: string; file: FileDiff }[];
  additions: number;
  deletions: number;
  count: number;
}

function newTreeNode(): TreeNode {
  return { dirs: new Map(), files: [], additions: 0, deletions: 0, count: 0 };
}

/** Builds a directory tree from the (sorted) flat file list. */
function buildTree(files: FileDiff[], pad: number): TreeNode {
  const root = newTreeNode();
  files.forEach((file, i) => {
    const href = `files/${String(i + 1).padStart(pad, "0")}.html`;
    const segments = file.path.split("/");
    const fileName = segments.pop() ?? file.path;
    let node = root;
    node.count += 1;
    node.additions += file.additions;
    node.deletions += file.deletions;
    for (const seg of segments) {
      let child = node.dirs.get(seg);
      if (!child) {
        child = newTreeNode();
        node.dirs.set(seg, child);
      }
      child.count += 1;
      child.additions += file.additions;
      child.deletions += file.deletions;
      node = child;
    }
    node.files.push({ name: fileName, href, file });
  });
  return root;
}

function renderTreeChildren(node: TreeNode, depth: number): string {
  const dirNames = [...node.dirs.keys()].sort((a, b) => a.localeCompare(b));
  const dirHtml = dirNames
    .map((name) => renderDir(name, node.dirs.get(name)!, depth))
    .join("\n");
  const fileHtml = node.files.map((f) => renderFileRow(f.name, f.href, f.file)).join("\n");
  return dirHtml + (dirHtml && fileHtml ? "\n" : "") + fileHtml;
}

function renderDir(name: string, node: TreeNode, depth: number): string {
  // Open the top two levels (flavor + spec) by default; collapse deeper ones.
  const open = depth < 2 ? " open" : "";
  return `<details class="dir"${open}>
  <summary><span class="dirname">${escapeHtml(name)}/</span> <span class="counts"><span class="muted">${node.count} files</span> <span class="add">+${node.additions}</span> <span class="del">-${node.deletions}</span></span></summary>
  <div class="children">
${renderTreeChildren(node, depth + 1)}
  </div>
</details>`;
}

function renderFileRow(
  name: string,
  href: string,
  file: FileDiff,
): string {
  const badge =
    file.status === "added"
      ? `<span class="st added">A</span>`
      : file.status === "removed"
        ? `<span class="st removed">D</span>`
        : `<span class="st modified">M</span>`;
  return `<div class="file-row" data-path="${escapeHtml(file.path.toLowerCase())}">
  ${badge}<a href="${href}">${escapeHtml(name)}</a><span class="counts"><span class="add">+${file.additions}</span> <span class="del">-${file.deletions}</span></span>
</div>`;
}

/** One page per changed file: rich side-by-side diff with prev/next nav. */
function renderFilePage(file: FileDiff, files: FileDiff[], index: number): string {
  const pad = String(files.length).length;
  const fileName = (i: number): string => `${String(i + 1).padStart(pad, "0")}.html`;
  const prev = index > 0 ? `<a href="${fileName(index - 1)}">← Prev</a>` : `<span class="muted">← Prev</span>`;
  const next =
    index < files.length - 1
      ? `<a href="${fileName(index + 1)}">Next →</a>`
      : `<span class="muted">Next →</span>`;

  const chunkBytes = Buffer.byteLength(file.chunk, "utf8");
  let diffBody: string;
  if (chunkBytes > MAX_FILE_DIFF_BYTES) {
    diffBody = `<div class="no-changes">⚠️ This file's diff is too large to render (${(
      chunkBytes /
      (1024 * 1024)
    ).toFixed(1)} MB). <a href="../diff.txt">View it in the raw diff</a>.</div>`;
  } else {
    try {
      diffBody = diff2html(file.chunk, {
        drawFileList: false,
        matching: "lines",
        outputFormat: "side-by-side",
      });
    } catch (err) {
      console.warn(pc.yellow(`Rendering ${file.path} failed (${err}); showing raw chunk.`));
      diffBody = `<pre class="raw">${escapeHtml(file.chunk)}</pre>`;
    }
  }

  const nav = `<nav class="filenav">
  <a href="../index.html">☰ All files</a>
  <span class="spacer"></span>
  ${prev} <span class="counter">${index + 1} / ${files.length}</span> ${next}
</nav>`;

  const header = `<header>
  <h1>${escapeHtml(file.path)}</h1>
  <div class="meta"><span class="add">+${file.additions}</span> / <span class="del">-${file.deletions}</span> · ${file.status}</div>
</header>`;

  return pageShell(`${file.path} · ${TITLE}`, header + nav, diffBody, "..", nav);
}

function headerHtml(summary: DiffSummary): string {
  const tagLine = summary.baselineTag
    ? `Baseline tag: <code>${escapeHtml(summary.baselineTag)}</code>`
    : "Baseline: <em>none (not bootstrapped)</em>";
  const noteHtml = summary.note ? `<p class="note">⚠️ ${escapeHtml(summary.note)}</p>` : "";
  return `<header>
  <h1>${escapeHtml(TITLE)}</h1>
  <div class="meta">${tagLine} &nbsp;·&nbsp; ${summary.filesChanged} files changed &nbsp;·&nbsp; <span class="add">+${summary.additions}</span> / <span class="del">-${summary.deletions}</span></div>
</header>${noteHtml}`;
}

/** Wraps body content in a full HTML document linking the shared stylesheet. */
function pageShell(
  title: string,
  headerAndNav: string,
  body: string,
  cssBase: string,
  footerNav = "",
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${cssBase}/diff2html.css" />
</head>
<body>
${headerAndNav}
<div class="content">
${body}
</div>
${footerNav}
</body>
</html>
`;
}

/** Site chrome shared across all pages (appended to the diff2html stylesheet). */
const SITE_CSS = `
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2328; }
header { padding: 16px 20px; background: #24292f; color: #fff; }
header h1 { margin: 0 0 6px; font-size: 18px; word-break: break-all; }
header .meta { font-size: 13px; opacity: 0.9; }
header code { background: rgba(255,255,255,0.15); padding: 1px 5px; border-radius: 4px; }
.add { color: #3fb950; }
.del { color: #f85149; }
.note { color: #9a6700; background: #fff8c5; margin: 12px 20px; padding: 10px 14px; border-radius: 6px; }
.no-changes { margin: 40px 20px; font-size: 16px; color: #1a7f37; }
.content { padding: 12px 16px; }
.hint { color: #57606a; font-size: 13px; margin: 8px 0 16px; }
#filter { width: 100%; box-sizing: border-box; padding: 8px 12px; font-size: 14px; border: 1px solid #d0d7de; border-radius: 6px; margin-top: 12px; }
.treebar { display: flex; align-items: center; gap: 10px; margin: 10px 0 14px; flex-wrap: wrap; }
.treebar button { font-size: 12px; padding: 4px 10px; border: 1px solid #d0d7de; background: #f6f8fa; border-radius: 6px; cursor: pointer; }
.treebar button:hover { background: #eaeef2; }
.treebar .hint { margin: 0; }
.tree { font-size: 13px; }
details.dir { margin: 0; }
details.dir > summary { cursor: pointer; padding: 3px 6px; border-radius: 6px; list-style-position: inside; display: flex; align-items: center; gap: 8px; }
details.dir > summary:hover { background: #f0f3f6; }
details.dir > summary .dirname { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; }
details.dir > summary .counts { font-size: 11px; }
.counts { margin-left: auto; white-space: nowrap; font-variant-numeric: tabular-nums; display: inline-flex; gap: 8px; }
.children { margin-left: 16px; border-left: 1px solid #eaeef2; padding-left: 8px; }
.file-row { display: flex; align-items: center; gap: 8px; padding: 2px 6px; }
.file-row:hover { background: #f6f8fa; }
.file-row a { color: #0969da; text-decoration: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.file-row a:hover { text-decoration: underline; }
.st { font-size: 10px; font-weight: 700; width: 16px; height: 16px; line-height: 16px; text-align: center; border-radius: 4px; flex: none; }
.st.added { background: #dafbe1; color: #1a7f37; }
.st.removed { background: #ffebe9; color: #cf222e; }
.st.modified { background: #ddf4ff; color: #0969da; }
nav.filenav { display: flex; align-items: center; gap: 14px; padding: 8px 16px; background: #f6f8fa; border-bottom: 1px solid #d0d7de; font-size: 13px; }
nav.filenav .spacer { flex: 1; }
nav.filenav a { color: #0969da; text-decoration: none; }
nav.filenav .muted { color: #8c959f; }
nav.filenav .counter { color: #57606a; }
pre.raw { white-space: pre-wrap; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #f6f8fa; padding: 12px; border-radius: 6px; }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((err) => {
  console.error(pc.red(`Fatal error: ${err?.stack ?? err}`));
  process.exit(1);
});
