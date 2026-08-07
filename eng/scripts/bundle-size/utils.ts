// Shared helpers for the bundle-size scripts.

import { execFileSync } from "child_process";
import { isAbsolute, relative, resolve } from "path";
import { repoRoot } from "../helpers.js";

/** This repo's own `packages/` folder, as opposed to the `core/` submodule workspace. */
const packagesRoot = resolve(repoRoot, "packages");

export interface WorkspacePackage {
  name: string;
  version: string;
  /** Absolute path to the package directory. */
  path: string;
  private: boolean;
}

/**
 * List every package in the pnpm workspace (including the nested `core/` workspace),
 * using `pnpm list --recursive --depth -1 --json`.
 */
export function listPackages(): WorkspacePackage[] {
  const stdout = execFileSync("pnpm", ["list", "--recursive", "--depth", "-1", "--json"], {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
    // pnpm resolves to pnpm.cmd on Windows, which Node refuses to spawn directly.
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout) as Array<Partial<WorkspacePackage>>;
  return parsed
    .filter((pkg): pkg is WorkspacePackage => Boolean(pkg.name && pkg.path))
    .map((pkg) => ({ ...pkg, private: pkg.private ?? false }));
}

/**
 * True when the package lives in this repo's `packages/` folder, false for anything coming
 * from the nested `core/` submodule workspace.
 *
 * Core packages are published from `microsoft/typespec`, so a PR here can never change their
 * published size. They are also measured unreliably: unlike our packages they do not declare
 * a `files` field, so their tarballs include build artifacts such as `.turbo/turbo-build.log`
 * (which embeds the compiler version banner and CLI spinner frames) and `temp/`, making every
 * core package look like it changed by a handful of bytes on every run.
 */
export function isRepoPackage(pkg: WorkspacePackage): boolean {
  const rel = relative(packagesRoot, pkg.path);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * Colors for size trends, picked to stay legible on both the light and dark GitHub themes.
 */
const trendColors = {
  increase: "#e5534b",
  decrease: "#2da44e",
  neutral: "#8b949e",
} as const;

export type SizeTrend = keyof typeof trendColors;

/** Pick the trend for a delta: growing is bad (red), shrinking is good (green). */
export function trendOf(delta: number): SizeTrend {
  return delta > 0 ? "increase" : delta < 0 ? "decrease" : "neutral";
}

/**
 * Render `text` in color. GitHub renders `$...$` in comments as inline math, which is the only
 * way to get colored text inside a markdown table.
 */
export function colored(text: string, trend: SizeTrend): string {
  // `%` starts a comment in TeX so it has to reach the math renderer as `\%`. GitHub's markdown
  // pass eats one level of backslash escaping first, hence the doubled backslash here.
  const escaped = text.replace(/%/g, "\\\\%");
  return `$\\textcolor{${trendColors[trend]}}{\\textsf{${escaped}}}$`;
}

/** Format a byte count as a human readable string (B, KB, MB). */
export function formatBytes(bytes: number): string {
  const abs = Math.abs(bytes);
  if (abs < 1024) {
    return `${bytes} B`;
  }
  if (abs < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Format a signed byte delta, e.g. "+1.20 KB" / "-512 B" / "0 B". */
export function formatDelta(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const sign = bytes > 0 ? "+" : "-";
  return `${sign}${formatBytes(Math.abs(bytes))}`;
}

/** Format a signed percentage, e.g. "+3.4%". Returns "n/a" when base is 0. */
export function formatPercent(base: number, head: number): string {
  if (base === 0) {
    return head === 0 ? "0%" : "new";
  }
  const pct = ((head - base) / base) * 100;
  if (pct === 0) {
    return "0%";
  }
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
