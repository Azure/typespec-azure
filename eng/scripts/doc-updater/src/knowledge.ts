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
 * Get the git diff for the given source paths since a specific commit.
 * Returns the diff as a string, or empty string if there are no changes.
 */
export function getGitDiff(sourcePaths: string[], lastCommit: string): string {
  const paths = sourcePaths.join(" ");
  try {
    const diff = execSync(`git diff ${lastCommit}..HEAD -- ${paths}`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });
    return diff;
  } catch {
    // If the diff command fails (e.g. commit not found), return empty
    // which will trigger a full rebuild
    return "";
  }
}

/** Get the current HEAD commit hash. */
export function getCurrentCommit(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
}
