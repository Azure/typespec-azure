import { execFileSync as execGit } from "child_process";
import { mkdtemp, mkdir as mkdirp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cacheDirForCommit,
  checkDiff,
  fetchSpecs,
  loadConfig,
  resolveEntrypoint,
  resolveManifestForLocalDir,
} from "../smoke-test-common";

describe("loadConfig", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "smoke-cfg-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("parses a valid config", async () => {
    const path = join(dir, "cfg.json");
    await writeFile(
      path,
      JSON.stringify({
        specRepo: "Azure/azure-rest-api-specs",
        commit: "abc123",
        services: [{ name: "svc", specPath: "specification/x", scenarios: ["arm"] }],
      }),
    );
    const cfg = await loadConfig(path);
    expect(cfg.commit).toBe("abc123");
    expect(cfg.services).toHaveLength(1);
    expect(cfg.services[0].name).toBe("svc");
  });

  it("throws when a service is missing specPath", async () => {
    const path = join(dir, "cfg.json");
    await writeFile(
      path,
      JSON.stringify({ specRepo: "r", commit: "c", services: [{ name: "svc" }] }),
    );
    await expect(loadConfig(path)).rejects.toThrow(/specPath/);
  });

  it("throws when commit is missing", async () => {
    const path = join(dir, "cfg.json");
    await writeFile(path, JSON.stringify({ specRepo: "r", services: [] }));
    await expect(loadConfig(path)).rejects.toThrow(/commit/);
  });
});

describe("resolveEntrypoint", () => {
  it("returns main.tsp when only main.tsp exists", async () => {
    const fixture = resolve(__dirname, "fixtures/mini-service");
    expect(await resolveEntrypoint(fixture)).toBe(resolve(fixture, "main.tsp"));
  });

  it("throws when neither client.tsp nor main.tsp exists", async () => {
    const missing = resolve(__dirname, "fixtures/does-not-exist");
    await expect(resolveEntrypoint(missing)).rejects.toThrow(/no client.tsp or main.tsp/i);
  });
});

describe("resolveManifestForLocalDir", () => {
  it("builds a manifest entry pointing at the fixture entrypoint", async () => {
    const cacheRoot = resolve(__dirname, "fixtures");
    const manifest = await resolveManifestForLocalDir(cacheRoot, {
      name: "mini",
      specPath: "mini-service",
    });
    expect(manifest.name).toBe("mini");
    expect(manifest.entrypoint).toBe(resolve(cacheRoot, "mini-service/main.tsp"));
    expect(manifest.serviceDir).toBe(resolve(cacheRoot, "mini-service"));
  });
});

describe("checkDiff", () => {
  let repo: string;
  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), "smoke-diff-"));
    execGit("git", ["init", "-q"], { cwd: repo });
    execGit("git", ["config", "user.email", "t@t"], { cwd: repo });
    execGit("git", ["config", "user.name", "t"], { cwd: repo });
    await writeFile(join(repo, "snap.txt"), "baseline\n");
    execGit("git", ["add", "."], { cwd: repo });
    execGit("git", ["commit", "-qm", "baseline"], { cwd: repo });
  });
  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  it("returns clean=true when the snapshot dir is unchanged", async () => {
    const res = await checkDiff(repo, ".");
    expect(res.clean).toBe(true);
  });

  it("returns clean=false when the snapshot dir changed", async () => {
    await writeFile(join(repo, "snap.txt"), "changed\n");
    const res = await checkDiff(repo, ".");
    expect(res.clean).toBe(false);
    expect(res.diff).toContain("changed");
  });
});

describe("fetchSpecs cache short-circuit", () => {
  it("returns one manifest per service when the cache already exists", async () => {
    const commit = "testcommit";
    const cacheDir = cacheDirForCommit(commit);
    await rm(cacheDir, { recursive: true, force: true });
    await mkdirp(join(cacheDir, ".git"), { recursive: true });
    await mkdirp(join(cacheDir, "mini-service"), { recursive: true });
    await writeFile(join(cacheDir, "mini-service", "main.tsp"), "// placeholder\n");

    const manifests = await fetchSpecs({
      specRepo: "r",
      commit,
      services: [{ name: "mini", specPath: "mini-service" }],
    });
    expect(manifests).toHaveLength(1);
    expect(manifests[0].name).toBe("mini");

    await rm(cacheDir, { recursive: true, force: true });
  });
});
