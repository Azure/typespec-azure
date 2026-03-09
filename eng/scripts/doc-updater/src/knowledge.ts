/**
 * Knowledge base management for the doc-updater system.
 *
 * Handles reading/writing knowledge files and metadata, computing git diffs
 * for incremental updates, and resolving knowledge file paths.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeMeta {
  /** The git commit hash that was last analyzed */
  lastCommit: string;
  /** ISO timestamp of the last knowledge build */
  lastUpdated: string;
  /** Source code glob patterns that were analyzed */
  analyzedPaths: string[];
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Directory containing generated knowledge files, relative to this source file. */
const KNOWLEDGE_DIR = resolve(import.meta.dirname ?? ".", "../knowledge");

/** Repository root, resolved from this source file's location. */
const REPO_ROOT = resolve(import.meta.dirname ?? ".", "../../../..");

/** Get the absolute path to a package's knowledge base file. */
export function getKnowledgePath(configName: string): string {
  return resolve(KNOWLEDGE_DIR, `${configName}.md`);
}

/**
 * Get the repo-root-relative path to a package's knowledge base file.
 * This is what the agent prompt should reference (the agent CWD is repo root).
 */
export function getKnowledgeRelativePath(configName: string): string {
  return `eng/scripts/doc-updater/knowledge/${configName}.md`;
}

/** Get the absolute path to a package's metadata file. */
export function getMetaPath(configName: string): string {
  return resolve(KNOWLEDGE_DIR, `${configName}.meta.json`);
}

// ---------------------------------------------------------------------------
// Read / write operations
// ---------------------------------------------------------------------------

/** Read the metadata for a package's knowledge base. Returns null if not found. */
export async function readMeta(configName: string): Promise<KnowledgeMeta | null> {
  const metaPath = getMetaPath(configName);
  try {
    const raw = await readFile(metaPath, "utf-8");
    return JSON.parse(raw) as KnowledgeMeta;
  } catch {
    return null;
  }
}

/** Write metadata for a package's knowledge base. */
export async function writeMeta(configName: string, meta: KnowledgeMeta): Promise<void> {
  const metaPath = getMetaPath(configName);
  await mkdir(dirname(metaPath), { recursive: true });
  await writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf-8");
}

/** Read the knowledge base content for a package. Returns null if not found. */
export async function readKnowledge(configName: string): Promise<string | null> {
  const knowledgePath = getKnowledgePath(configName);
  try {
    return await readFile(knowledgePath, "utf-8");
  } catch {
    return null;
  }
}

/** Check whether a knowledge base exists for a package. */
export function knowledgeExists(configName: string): boolean {
  return existsSync(getKnowledgePath(configName));
}

// ---------------------------------------------------------------------------
// Git operations
// ---------------------------------------------------------------------------

/**
 * Check whether there are any commits affecting the given source paths
 * since the specified commit. This is a lightweight check (no diff content)
 * used to decide whether to start an agent session at all.
 *
 * Returns true if there are changes, false if nothing has changed.
 * Returns true on any error (fail-open → triggers a knowledge rebuild).
 */
export function hasChangesSince(sourcePaths: string[], lastCommit: string): boolean {
  const paths = sourcePaths.join(" ");
  try {
    const result = execSync(`git rev-list --count ${lastCommit}..HEAD -- ${paths}`, {
      encoding: "utf-8",
      cwd: REPO_ROOT,
    }).trim();
    return parseInt(result, 10) > 0;
  } catch {
    // If the command fails (e.g. commit not found), assume changes exist
    // so we fall through to a full rebuild
    return true;
  }
}

/** Get the current HEAD commit hash. */
export function getCurrentCommit(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf-8", cwd: REPO_ROOT }).trim();
}

/**
/**
 * Commit message pattern used by the doc-updater workflow after squash merge.
 * The PR title becomes the commit message: "[Automated] Update <config> documentation (...)"
 */
const DOC_UPDATER_GREP_FLAG = '--grep="\\[Automated\\] Update"';

/**
 * List commit hashes affecting the given source paths since the specified commit.
 * Excludes commits created by the doc-updater itself (matched by commit message pattern).
 * Returns hashes in chronological order (oldest first).
 * Returns empty array if no commits found or on error.
 */
export function listCommitsSince(sourcePaths: string[], lastCommit: string): string[] {
  const paths = sourcePaths.join(" ");
  try {
    const result = execSync(
      `git rev-list --invert-grep ${DOC_UPDATER_GREP_FLAG} ${lastCommit}..HEAD -- ${paths}`,
      {
        encoding: "utf-8",
        cwd: REPO_ROOT,
      },
    ).trim();
    if (!result) return [];
    return result.split("\n").reverse(); // oldest first
  } catch {
    return [];
  }
}

/** Split an array into chunks of the given size. */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
