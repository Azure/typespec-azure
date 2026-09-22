import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { storeResults } from "../src/store-results.js";

let root: string;
let remote: string;
let repo: string;
function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}
function sourceCommit(name: string, timestamp: string, cwd = repo) {
  writeFileSync(join(cwd, "source"), name);
  git(cwd, "add", "source");
  execFileSync("git", ["commit", "-qm", name], {
    cwd,
    env: { ...process.env, GIT_AUTHOR_DATE: timestamp, GIT_COMMITTER_DATE: timestamp },
  });
  return git(cwd, "rev-parse", "HEAD");
}
async function save(commit: string, timestamp: string, value = 1, repoDir = repo) {
  const resultsFile = join(root, `${commit}.json`);
  writeFileSync(resultsFile, JSON.stringify({ commit, timestamp, runner: {}, specs: {}, value }));
  await storeResults({ resultsFile, commit, repoDir });
}
function published(file: string) {
  return JSON.parse(git(root, "--git-dir", remote, "show", `benchmark-data:results/${file}.json`));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "benchmark-store-test-"));
  remote = join(root, "remote.git");
  repo = join(root, "source");
  git(root, "init", "--bare", "-q", remote);
  git(root, "init", "-q", "-b", "main", repo);
  git(repo, "config", "user.name", "Original user");
  git(repo, "config", "user.email", "user@example.com");
  sourceCommit("source", "2026-09-01T00:00:00Z");
  git(repo, "remote", "add", "origin", remote);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("orders latest and history by source commits, not measurement completion", async () => {
  const older = sourceCommit("older", "2026-09-22T13:00:00Z");
  const newer = sourceCommit("newer", "2026-09-22T13:30:00Z");
  await save(older, "2026-09-22T14:00:00Z");
  await save(newer, "2026-09-22T13:30:00Z");
  expect(published("latest").commit).toBe(newer);
  await save(older, "2026-09-22T15:00:00Z");
  expect(published("latest").commit).toBe(newer);
  expect(published(older).timestamp).toBe("2026-09-22T15:00:00Z");
  expect(Date.parse(published(older).commitTimestamp)).toBe(Date.parse("2026-09-22T13:00:00Z"));
  const history = published("history");
  expect(history.entries.map((entry: { commit: string }) => entry.commit)).toEqual([older, newer]);
  expect(Date.parse(history.entries[1].commitTimestamp)).toBe(Date.parse("2026-09-22T13:30:00Z"));
  expect(git(repo, "rev-parse", "HEAD")).toBe(newer);
  expect(git(repo, "config", "user.name")).toBe("Original user");
  expect(readFileSync(join(repo, "source"), "utf8")).toBe("newer");
}, 30_000);

it.each(["2026-09-22T13:00:00Z", "2026-09-22T12:00:00Z"])(
  "uses ancestry when commit dates are equal or skewed: %s",
  async (newerDate) => {
    const older = sourceCommit("older", "2026-09-22T13:00:00Z");
    const newer = sourceCommit("newer", newerDate);
    await save(newer, "2026-09-22T14:00:00Z");
    await save(older, "2026-09-22T14:00:00Z");
    expect(published("latest").commit).toBe(newer);
    expect(published("history").entries.map((entry: { commit: string }) => entry.commit)).toEqual([
      older,
      newer,
    ]);
  },
  30_000,
);

it("updates latest when replacing its commit, even with an earlier measurement timestamp", async () => {
  const commit = sourceCommit("same", "2026-09-22T00:00:00Z");
  await save(commit, "2026-09-22T02:00:00Z");
  await save(commit, "2026-09-22T01:00:00Z", 2);
  expect(published("latest").value).toBe(2);
  expect(published(commit).value).toBe(2);
});

it("recovers a newer source commit published after this checkout was created", async () => {
  const older = sourceCommit("older", "2026-09-22T13:00:00Z");
  git(repo, "push", "-q", "origin", "main");
  await save(older, "2026-09-22T14:00:00Z");
  const publisher = join(root, "publisher");
  git(root, "clone", "-q", "--branch", "main", remote, publisher);
  git(publisher, "config", "user.name", "Other publisher");
  git(publisher, "config", "user.email", "other@example.com");
  const newer = sourceCommit("newer", "2026-09-22T13:30:00Z", publisher);
  git(publisher, "push", "-q", "origin", "main");
  await save(newer, "2026-09-22T14:30:00Z", 1, publisher);
  expect(() => git(repo, "cat-file", "-e", newer)).toThrow();
  await save(older, "2026-09-22T15:00:00Z");
  expect(published("latest").commit).toBe(newer);
  expect(git(repo, "cat-file", "-t", newer)).toBe("commit");
  expect(git(repo, "rev-parse", "HEAD")).toBe(older);
}, 30_000);

it("regenerates ordered history after a concurrent publisher writes legacy results", async () => {
  const older = sourceCommit("older", "2026-09-20T00:00:00Z");
  const initial = sourceCommit("initial", "2026-09-21T00:00:00Z");
  const newer = sourceCommit("newer", "2026-09-23T00:00:00Z");
  await save(initial, "2026-09-24T00:00:00Z");
  const racer = join(root, "racer");
  git(root, "clone", "-q", "--branch", "benchmark-data", remote, racer);
  git(racer, "config", "user.name", "Concurrent publisher");
  git(racer, "config", "user.email", "publisher@example.com");
  const result = JSON.stringify({
    commit: newer,
    timestamp: "2026-09-23T00:00:00Z",
    runner: {},
    specs: {},
  });
  writeFileSync(join(racer, `results/${newer}.json`), result);
  writeFileSync(join(racer, "results/latest.json"), result);
  git(racer, "add", "results");
  git(racer, "commit", "-qm", "Concurrent result");
  const hooks = join(root, "hooks");
  mkdirSync(hooks);
  git(repo, "config", "core.hooksPath", hooks);
  const hook = join(hooks, "pre-push");
  writeFileSync(
    hook,
    `#!/bin/sh
if [ ! -f "${root}/raced" ]; then
  touch "${root}/raced"
  unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_COMMON_DIR
  git -C "${racer}" push origin HEAD:benchmark-data
fi
`,
  );
  chmodSync(hook, 0o755);
  await save(older, "2026-09-25T00:00:00Z");
  expect(published("latest").commit).toBe(newer);
  expect(Date.parse(published("latest").commitTimestamp)).toBe(Date.parse("2026-09-23T00:00:00Z"));
  expect(published("history").entries.map((entry: { commit: string }) => entry.commit)).toEqual([
    older,
    initial,
    newer,
  ]);
}, 30_000);
