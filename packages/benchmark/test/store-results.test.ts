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
function save(commit: string, timestamp: string, value = 1) {
  const resultsFile = join(root, `${commit}.json`);
  writeFileSync(resultsFile, JSON.stringify({ commit, timestamp, runner: {}, specs: {}, value }));
  storeResults({ resultsFile, commit, repoDir: repo });
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
  writeFileSync(join(repo, "source"), "source");
  git(repo, "add", "source");
  git(repo, "commit", "-qm", "initial");
  git(repo, "remote", "add", "origin", remote);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("publishes historical results without moving latest backwards or changing the caller", () => {
  const head = git(repo, "rev-parse", "HEAD");
  save("new", "2026-09-22T00:00:00Z");
  save("old", "2026-09-20T00:00:00Z");
  expect(published("latest").commit).toBe("new");
  expect(published("old").commit).toBe("old");
  expect(published("history").entries.map((entry: { commit: string }) => entry.commit)).toEqual([
    "old",
    "new",
  ]);
  expect(git(repo, "rev-parse", "HEAD")).toBe(head);
  expect(git(repo, "config", "user.name")).toBe("Original user");
  expect(readFileSync(join(repo, "source"), "utf8")).toBe("source");
});

it("updates latest when replacing its commit, even with an earlier commit timestamp", () => {
  save("same", "2026-09-22T01:00:00Z");
  save("same", "2026-09-22T00:00:00Z", 2);
  expect(published("latest").value).toBe(2);
  expect(published("same").value).toBe(2);
});

it("regenerates history after a concurrent publisher advances the data branch", () => {
  save("initial", "2026-09-21T00:00:00Z");
  const racer = join(root, "racer");
  git(root, "clone", "-q", "--branch", "benchmark-data", remote, racer);
  git(racer, "config", "user.name", "Concurrent publisher");
  git(racer, "config", "user.email", "publisher@example.com");
  const newer = JSON.stringify({
    commit: "newer",
    timestamp: "2026-09-23T00:00:00Z",
    runner: {},
    specs: {},
  });
  writeFileSync(join(racer, "results/newer.json"), newer);
  writeFileSync(join(racer, "results/latest.json"), newer);
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

  save("older", "2026-09-20T00:00:00Z");
  expect(published("latest").commit).toBe("newer");
  expect(published("older").commit).toBe("older");
  expect(published("history").entries.map((entry: { commit: string }) => entry.commit)).toEqual([
    "older",
    "initial",
    "newer",
  ]);
}, 30_000);
