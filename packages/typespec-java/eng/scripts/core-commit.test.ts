import { execa } from "execa";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getCoreSourceRoot, removeCoreSourceRoot } from "./core-commit.ts";

describe("core source", () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
    );
  });

  it("uses the current checkout when the pin is absent", async () => {
    const root = await createCoreRepository();
    const packageRoot = join(root, "package");
    await mkdir(packageRoot);

    const source = await getCoreSourceRoot(root, packageRoot);

    expect(source).toEqual({ root: join(root, "packages", "http-client-java") });
  });

  it("reports how to initialize a missing core submodule", async () => {
    const root = await mkdtemp(join(tmpdir(), "typespec-java-core-test-"));
    tempDirectories.push(root);

    await expect(getCoreSourceRoot(root, join(root, "package"))).rejects.toThrow(
      "Run 'git submodule update --init core' from the repository root.",
    );
  });

  it("extracts and cleans up a different pinned commit", async () => {
    const root = await createCoreRepository();
    const packageRoot = join(root, "package");
    await mkdir(packageRoot);
    const originalSha = (await execa("git", ["-C", root, "rev-parse", "HEAD"])).stdout;
    const fixture = join(root, "packages", "http-client-java", "emitter", "fixture.txt");
    await writeFile(fixture, "updated");
    await execa("git", ["-C", root, "commit", "-am", "update fixture"]);
    await writeFile(join(packageRoot, "core-commit.json"), JSON.stringify({ sha: originalSha }));

    const source = await getCoreSourceRoot(root, packageRoot);

    expect(await readFile(join(source.root, "emitter", "fixture.txt"), "utf8")).toBe("original");
    expect(source.tempDir).toBeDefined();
    await removeCoreSourceRoot(source);
    await expect(access(source.tempDir!)).rejects.toThrow();
  });

  async function createCoreRepository(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "typespec-java-core-test-"));
    tempDirectories.push(root);
    const emitter = join(root, "packages", "http-client-java", "emitter");
    await mkdir(emitter, { recursive: true });
    await writeFile(join(emitter, "fixture.txt"), "original");
    await execa("git", ["init", root]);
    await execa("git", ["-C", root, "config", "user.name", "TypeSpec Test"]);
    await execa("git", ["-C", root, "config", "user.email", "typespec@example.com"]);
    await execa("git", ["-C", root, "add", "."]);
    await execa("git", ["-C", root, "commit", "-m", "initial fixture"]);
    return root;
  }
});
