import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { resolveCommitRange, restoreBenchmark } from "../src/backfill.js";
import { withTemporaryWorktree } from "../src/utils.js";

let root: string;
function git(...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}
function commit(value: string) {
  writeFileSync(join(root, "file"), value);
  git("add", "file");
  git("commit", "-qm", value);
  return git("rev-parse", "HEAD");
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "benchmark-backfill-test-"));
  git("init", "-q", "-b", "main");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("selects the latest N commits oldest first from the requested source", () => {
  commit("one");
  const two = commit("two");
  const three = commit("three");
  expect(resolveCommitRange(root, "2", undefined, "main")).toEqual([two, three]);
});

it("supports exactly one historical commit and inclusive ranges", () => {
  const one = commit("one");
  const two = commit("two");
  expect(resolveCommitRange(root, one, one, "main")).toEqual([one]);
  expect(resolveCommitRange(root, one, two, "main")).toEqual([one, two]);
});

it("rejects invalid counts and reversed ranges", () => {
  const one = commit("one");
  const two = commit("two");
  expect(() => resolveCommitRange(root, "0", undefined, "main")).toThrow(/positive/);
  expect(() => resolveCommitRange(root, two, one, "main")).toThrow(/ancestor/);
});

it("leaves the caller's branch and dirty files untouched, including on failure", async () => {
  const old = commit("old");
  const current = commit("current");
  writeFileSync(join(root, "file"), "uncommitted");
  let worktree = "";
  await expect(
    withTemporaryWorktree(root, old, async (dir) => {
      worktree = dir;
      expect(readFileSync(join(dir, "file"), "utf8")).toBe("old");
      writeFileSync(join(dir, "generated"), "output");
      throw new Error("generator failed");
    }),
  ).rejects.toThrow("generator failed");
  expect(git("rev-parse", "HEAD")).toBe(current);
  expect(git("branch", "--show-current")).toBe("main");
  expect(readFileSync(join(root, "file"), "utf8")).toBe("uncommitted");
  expect(existsSync(worktree)).toBe(false);
});

it("removes package junctions without deleting targets outside the temporary worktree", async () => {
  const sha = commit("initial");
  const outside = join(root, "shared-package");
  await mkdir(outside);
  writeFileSync(join(outside, "keep"), "preserved");
  let worktree = "";
  await withTemporaryWorktree(root, sha, async (dir) => {
    worktree = dir;
    const target = join(dir, "packages/benchmark/.emitters/node_modules/csharp");
    const modules = join(dir, "packages/benchmark/node_modules");
    await mkdir(target, { recursive: true });
    await mkdir(modules, { recursive: true });
    writeFileSync(join(target, "package.json"), "{}");
    await symlink(target, join(modules, "csharp"), "junction");
    await symlink(outside, join(modules, "shared"), "junction");
  });
  expect(existsSync(dirname(worktree))).toBe(false);
  expect(readFileSync(join(outside, "keep"), "utf8")).toBe("preserved");
  expect(git("worktree", "list", "--porcelain")).not.toContain(worktree);
});

it("restores the current harness without stale sources or deleting installed packages", async () => {
  const source = join(root, "saved");
  const destination = join(root, "historical/packages/benchmark");
  for (const part of ["dist", "src", "specs", "external-spec", "scripts"]) {
    await mkdir(join(source, part), { recursive: true });
    await mkdir(join(destination, part), { recursive: true });
    writeFileSync(join(source, part, "current"), "current");
    writeFileSync(join(destination, part, "obsolete"), "old");
  }
  for (const file of ["package.json", "tsconfig.json", "tsconfig.build.json", ".gitignore"]) {
    writeFileSync(join(source, file), "{}");
  }
  await mkdir(join(destination, "node_modules"), { recursive: true });
  writeFileSync(join(destination, "node_modules/keep"), "installed");
  restoreBenchmark(source, join(root, "historical"));
  expect(readFileSync(join(destination, "src/current"), "utf8")).toBe("current");
  expect(existsSync(join(destination, "src/obsolete"))).toBe(false);
  expect(readFileSync(join(destination, "node_modules/keep"), "utf8")).toBe("installed");
});

it("cleans up an initialized submodule without changing the caller's submodule config", async () => {
  commit("initial");
  const library = join(root, "library");
  git("init", "-q", library);
  git("-C", library, "config", "user.name", "Test");
  git("-C", library, "config", "user.email", "test@example.com");
  writeFileSync(join(library, "library"), "library");
  git("-C", library, "add", "library");
  git("-C", library, "commit", "-qm", "library");
  git("-c", "protocol.file.allow=always", "submodule", "add", library, "core");
  git("commit", "-qam", "submodule");
  const url = git("config", "submodule.core.url");
  await withTemporaryWorktree(root, git("rev-parse", "HEAD"), async (dir) => {
    git("-C", dir, "-c", "protocol.file.allow=always", "submodule", "update", "--init");
    expect(readFileSync(join(dir, "core/library"), "utf8")).toBe("library");
  });
  expect(git("config", "submodule.core.url")).toBe(url);
  expect(readFileSync(join(root, "core/library"), "utf8")).toBe("library");
}, 30_000);
