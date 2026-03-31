/**
 * Pipeline state management for the doc-updater system.
 *
 * Handles reading/writing knowledge files and metadata, computing git diffs
 * for incremental updates, resolving file paths, and detecting human feedback.
 */

import { execSync } from "node:child_process";
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
  /** Last merged automated doc-update PR already processed for feedback learning */
  lastPrNumber?: number;
}

/**
 * Represents human feedback detected on a merged doc-updater PR.
 */
export interface HumanFeedback {
  /** The PR number that was checked */
  prNumber: number;
  /** Human-authored commits on the PR (message + sha) */
  commits: Array<{ sha: string; message: string }>;
  /** Review comments left on the PR */
  reviewComments: string[];
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Directory containing generated knowledge files, relative to this source file. */
const KNOWLEDGE_DIR = resolve(import.meta.dirname ?? ".", "../knowledge");

/** Repository root, found via git. */
const REPO_ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();

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

// ---------------------------------------------------------------------------
// Git operations
// ---------------------------------------------------------------------------

/** Get the current HEAD commit hash. */
export function getCurrentCommit(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf-8", cwd: REPO_ROOT }).trim();
}

/**
 * Commit message pattern used by the doc-updater workflow after squash merge.
 * The PR title becomes the commit message: "[Automated]"
 */
const DOC_UPDATER_GREP_PATTERN = "\\[Automated\\]";

/**
 * List commit hashes affecting the given source paths since the specified commit.
 * Excludes commits created by the doc-updater itself (matched by commit message pattern).
 * Returns hashes in chronological order (oldest first).
 * Returns empty array if no commits found or on error.
 */
export function listCommitsSince(sourcePaths: string[], lastCommit: string): string[] {
  const paths = sourcePaths.map((p) => `"${p}"`).join(" ");

  // Debug: check total commits (without grep filter) to distinguish
  // "no commits at all" from "all commits filtered by grep"
  const countCmd = `git rev-list --count ${lastCommit}..HEAD -- ${paths}`;
  const filteredCmd = `git rev-list --invert-grep --grep="${DOC_UPDATER_GREP_PATTERN}" ${lastCommit}..HEAD -- ${paths}`;
  try {
    const totalCount = execSync(countCmd, { encoding: "utf-8", cwd: REPO_ROOT }).trim();
    console.log(`[state] Total commits since ${lastCommit.slice(0, 8)}: ${totalCount}`);
    const result = execSync(filteredCmd, { encoding: "utf-8", cwd: REPO_ROOT }).trim();
    const filtered = result ? result.split("\n") : [];
    console.log(`[state] After filtering [Automated]: ${filtered.length}`);
    if (!result) return [];
    return filtered.reverse(); // oldest first
  } catch (e) {
    const stderr = (e as { stderr?: string }).stderr ?? String(e);
    console.error(
      `[state] listCommitsSince failed:\n  countCmd: ${countCmd}\n  filteredCmd: ${filteredCmd}\n  cwd: ${REPO_ROOT}\n  error: ${stderr}`,
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Diff extraction
// ---------------------------------------------------------------------------

/** Maximum diff size per commit (100 KB). Larger diffs are truncated. */
const MAX_DIFF_SIZE = 100 * 1024;

/**
 * Get the unified diff for a specific commit, optionally filtered to paths.
 * Returns empty string if the commit doesn't exist or on error.
 * Truncates output to MAX_DIFF_SIZE to prevent context blowup.
 */
export function getCommitDiff(sha: string, paths?: string[]): string {
  const pathFilter = paths && paths.length > 0 ? " -- " + paths.map((p) => `"${p}"`).join(" ") : "";
  try {
    let diff = execSync(`git diff-tree -p --no-commit-id ${sha}${pathFilter}`, {
      encoding: "utf-8",
      cwd: REPO_ROOT,
      maxBuffer: 5 * 1024 * 1024,
    }).trim();
    if (diff.length > MAX_DIFF_SIZE) {
      diff = diff.slice(0, MAX_DIFF_SIZE) + "\n\n[... diff truncated at 100KB ...]";
    }
    return diff;
  } catch {
    return "";
  }
}

/**
 * Find the latest merged automated doc-update PR for a config.
 *
 * Uses the PR title prefix added by the agentic workflow safe output:
 *   [Automated][<config>] ...
 *
 * Returns null if no matching merged PR is found or on error.
 */
export function getLatestMergedAutomatedPr(configName: string): number | null {
  const search = `\\"[Automated][${configName}]\\" in:title is:pr is:merged`;
  try {
    const result = execSync(
      `gh pr list --state merged --search "${search}" --limit 1 --json number --jq ".[0].number"`,
      {
        encoding: "utf-8",
        cwd: REPO_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      },
    ).trim();
    return result ? Number(result) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Feedback detection
// ---------------------------------------------------------------------------

/**
 * Check a merged doc-updater PR for human modifications.
 *
 * Uses `gh` CLI to query the PR. Detects:
 *  - Extra commits beyond the bot's initial commit
 *  - Review comments left by humans
 *
 * Returns null if the PR has no human feedback, was not merged, or on error.
 */
export function getHumanFeedback(prNumber: number): HumanFeedback | null {
  try {
    // Check if PR is merged
    const state = execSync(`gh pr view ${prNumber} --json state,mergedAt --jq ".state"`, {
      encoding: "utf-8",
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (state !== "MERGED") {
      return null;
    }

    // Get all commits on the PR
    const commitsJson = execSync(`gh pr view ${prNumber} --json commits --jq ".commits"`, {
      encoding: "utf-8",
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const commits = JSON.parse(commitsJson) as Array<{
      oid: string;
      messageHeadline: string;
      authors: Array<{ login: string }>;
    }>;

    // Bot commits match the automated pattern; everything else is human
    const humanCommits = commits.filter((c) => !c.messageHeadline.startsWith("docs: automated"));

    // Get review comments
    const reviewsJson = execSync(`gh pr view ${prNumber} --json reviews --jq ".reviews"`, {
      encoding: "utf-8",
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const reviews = JSON.parse(reviewsJson) as Array<{
      body: string;
      state: string;
      author: { login: string };
    }>;

    const reviewComments = reviews
      .filter((r) => r.body && r.body.trim().length > 0)
      .map((r) => `[${r.author.login}] ${r.body.trim()}`);

    // No feedback if no human commits and no review comments
    if (humanCommits.length === 0 && reviewComments.length === 0) {
      return null;
    }

    return {
      prNumber,
      commits: humanCommits.map((c) => ({
        sha: c.oid,
        message: c.messageHeadline,
      })),
      reviewComments,
    };
  } catch {
    // gh CLI not available or API error — skip feedback silently
    return null;
  }
}
