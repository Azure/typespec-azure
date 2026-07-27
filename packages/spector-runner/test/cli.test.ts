import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "../src/cli.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "spector-cli-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("cli", () => {
  it("prints help and exits 0 for --help", async () => {
    expect(await main(["--help"])).toBe(0);
  });

  it("rejects when --config is missing", async () => {
    await expect(main(["--specs-root", root, "--emit", "e"])).rejects.toThrow(/--config/);
  });

  it("rejects when --specs-root is missing", async () => {
    const config = join(root, "c.yaml");
    writeFileSync(config, "specs: {}\n");
    await expect(main(["--config", config, "--emit", "e"])).rejects.toThrow(/--specs-root/);
  });

  it("rejects when --emit is missing", async () => {
    const config = join(root, "c.yaml");
    writeFileSync(config, "specs: {}\n");
    await expect(main(["--config", config, "--specs-root", root])).rejects.toThrow(/--emit/);
  });

  it("returns 0 for an empty spec set", async () => {
    const config = join(root, "c.yaml");
    writeFileSync(config, "specs: {}\n");
    expect(await main(["--config", config, "--specs-root", root, "--emit", "e"])).toBe(0);
  });
});
