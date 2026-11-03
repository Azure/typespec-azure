import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseEvaluationArgs, resolveEvaluationInputs } from "../scripts/evaluation-inputs.mjs";

const repositories = [];
afterEach(() => {
  for (const repository of repositories.splice(0)) {
    rmSync(repository, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "breaking-evaluation-"));
  repositories.push(root);
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  git("init", "--initial-branch=main");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  mkdirSync(path.join(root, "spec"));
  writeFileSync(path.join(root, "spec", "main.tsp"), "model Widget {}");
  git("add", ".");
  git("commit", "-m", "fixture");
  return {
    root,
    manifest: {
      revision: git("rev-parse", "HEAD"),
      specs: [{ name: "fixture", relativePath: "spec" }],
    },
  };
}

describe("evaluation input contract", () => {
  it("uses explicit checkout input without implicit acquisition", () => {
    expect(
      parseEvaluationArgs(["--repo", "explicit", "--out", "report.json"], {
        AZURE_REST_API_SPECS: "env",
      }),
    ).toEqual({ repository: "explicit", out: "report.json", help: false });
    expect(parseEvaluationArgs([], { AZURE_REST_API_SPECS: "env" }).repository).toBe("env");
    expect(parseEvaluationArgs(["--help"], {}).help).toBe(true);
    expect(() => parseEvaluationArgs([], {})).toThrow("Provide --repo");
    expect(() => parseEvaluationArgs(["--repo"], {})).toThrow("requires a value");
    expect(() => parseEvaluationArgs(["--unknown"], {})).toThrow("Unknown evaluation argument");
  });

  it("resolves manifest entrypoints at the exact revision", () => {
    const { root, manifest } = fixture();
    expect(resolveEvaluationInputs(root, manifest)).toEqual({
      repository: root,
      revision: manifest.revision,
      specs: [{ name: "fixture", relativePath: "spec", root: path.join(root, "spec") }],
    });
  });

  it("rejects a wrong revision, dirty checkout, and missing entrypoint", () => {
    const { root, manifest } = fixture();
    expect(() => resolveEvaluationInputs(root, { ...manifest, revision: "wrong" })).toThrow(
      "Expected specs revision",
    );
    expect(() =>
      resolveEvaluationInputs(root, { ...manifest, specs: [{ relativePath: "missing" }] }),
    ).toThrow("Missing evaluation entrypoint");
    writeFileSync(path.join(root, "spec", "main.tsp"), "model Changed {}");
    expect(() => resolveEvaluationInputs(root, manifest)).toThrow("tracked modifications");
  });
});
