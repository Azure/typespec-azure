import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG, computeAffected, matchesAny } from "./detect-affected.ts";

const NONE = new Set<string>();

// The module's CLI block is guarded by an `import.meta.url` check and never runs
// on import, but mock console.log defensively so nothing pollutes the test UI.
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("matchesAny (exact path or `dir/**` prefix)", () => {
  it("`dir/**` matches the dir and anything under it", () => {
    const g = ".github/actions/setup/**";
    expect(matchesAny(".github/actions/setup", [g])).toBe(true);
    expect(matchesAny(".github/actions/setup/action.yml", [g])).toBe(true);
    expect(matchesAny(".github/actions/setup/nested/x.ts", [g])).toBe(true);
    // Must NOT leak into a sibling dir that shares the prefix.
    expect(matchesAny(".github/actions/setup-python/action.yml", [g])).toBe(false);
  });

  it("exact path matches only that path", () => {
    const g = ".github/workflows/ci-python.yml";
    expect(matchesAny(".github/workflows/ci-python.yml", [g])).toBe(true);
    expect(matchesAny(".github/workflows/ci-java.yml", [g])).toBe(false);
    // An exact pattern is not a prefix: a deeper path must not match.
    expect(matchesAny(".github/workflows/ci-python.yml/extra", [g])).toBe(false);
  });

  it("returns true if any pattern matches", () => {
    const pats = [".github/workflows/ci-python.yml", ".github/actions/setup-python/**"];
    expect(matchesAny(".github/actions/setup-python/action.yml", pats)).toBe(true);
    expect(matchesAny(".github/workflows/ci-java.yml", pats)).toBe(false);
  });
});

describe("computeAffected", () => {
  it("target affected when its own package is in the affected set", () => {
    const r = computeAffected(new Set(["@azure-tools/typespec-python"]), [], CONFIG);
    expect(r).toEqual({ python: true, java: false, typescript: false });
  });

  it("all emitters affected when they appear as graph dependents", () => {
    const all = new Set([
      "@azure-tools/typespec-python",
      "@azure-tools/typespec-java",
      "@azure-tools/typespec-ts",
    ]);
    expect(computeAffected(all, [], CONFIG)).toEqual({
      python: true,
      java: true,
      typescript: true,
    });
  });

  it("nothing affected with no packages and no files", () => {
    expect(computeAffected(NONE, [], CONFIG)).toEqual({
      python: false,
      java: false,
      typescript: false,
    });
  });

  it("target CI workflow change triggers only that target", () => {
    expect(computeAffected(NONE, [".github/workflows/ci-python.yml"], CONFIG)).toEqual({
      python: true,
      java: false,
      typescript: false,
    });
  });

  it("target setup action change triggers only that target", () => {
    expect(computeAffected(NONE, [".github/actions/setup-java/action.yml"], CONFIG)).toEqual({
      python: false,
      java: true,
      typescript: false,
    });
  });

  it("shared setup action change triggers all targets", () => {
    expect(computeAffected(NONE, [".github/actions/setup/action.yml"], CONFIG)).toEqual({
      python: true,
      java: true,
      typescript: true,
    });
  });

  it("core submodule bump triggers all targets", () => {
    expect(computeAffected(NONE, ["core"], CONFIG)).toEqual({
      python: true,
      java: true,
      typescript: true,
    });
  });

  it("unrelated root file change triggers nothing", () => {
    expect(computeAffected(NONE, ["README.md", "package.json"], CONFIG)).toEqual({
      python: false,
      java: false,
      typescript: false,
    });
  });
});
