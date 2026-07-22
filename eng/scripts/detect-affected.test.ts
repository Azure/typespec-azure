import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG, computeAffected, matchesAny } from "./detect-affected.ts";

const NONE = new Set<string>();

// Expected-result helpers derived from CONFIG so these tests stay valid when a
// new emitter is added (config-only change) without editing every assertion.
const NONE_AFFECTED = Object.fromEntries(Object.keys(CONFIG.targets).map((k) => [k, false]));
const ALL_AFFECTED = Object.fromEntries(Object.keys(CONFIG.targets).map((k) => [k, true]));
const only = (...names: string[]) => ({
  ...NONE_AFFECTED,
  ...Object.fromEntries(names.map((n) => [n, true])),
});

// The module's CLI block is guarded by an `import.meta.url` check and never runs
// on import, but mock console.log defensively so nothing pollutes the test UI.
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("CONFIG (loaded from detect-affected.config.json)", () => {
  it("has a submodule path and at least one target", () => {
    expect(CONFIG.submodulePath).toBeTruthy();
    expect(Object.keys(CONFIG.targets).length).toBeGreaterThan(0);
  });

  it("every target declares a non-empty workspace package", () => {
    for (const [name, target] of Object.entries(CONFIG.targets)) {
      expect(target.package, `target "${name}" must set a package`).toBeTruthy();
    }
  });
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
    const r = computeAffected(new Set([CONFIG.targets.python.package]), [], CONFIG);
    expect(r).toEqual(only("python"));
  });

  it("all emitters affected when they appear as graph dependents", () => {
    const all = new Set(Object.values(CONFIG.targets).map((t) => t.package));
    expect(computeAffected(all, [], CONFIG)).toEqual(ALL_AFFECTED);
  });

  it("nothing affected with no packages and no files", () => {
    expect(computeAffected(NONE, [], CONFIG)).toEqual(NONE_AFFECTED);
  });

  it("target CI workflow change triggers only that target", () => {
    expect(computeAffected(NONE, [".github/workflows/ci-python.yml"], CONFIG)).toEqual(
      only("python"),
    );
  });

  it("target setup action change triggers only that target", () => {
    expect(computeAffected(NONE, [".github/actions/setup-java/action.yml"], CONFIG)).toEqual(
      only("java"),
    );
  });

  it("shared setup action change triggers all targets", () => {
    expect(computeAffected(NONE, [".github/actions/setup/action.yml"], CONFIG)).toEqual(
      ALL_AFFECTED,
    );
  });

  it("core submodule bump triggers all targets", () => {
    expect(computeAffected(NONE, ["core"], CONFIG)).toEqual(ALL_AFFECTED);
  });

  it("unrelated root file change triggers nothing", () => {
    expect(computeAffected(NONE, ["README.md", "package.json"], CONFIG)).toEqual(NONE_AFFECTED);
  });
});
