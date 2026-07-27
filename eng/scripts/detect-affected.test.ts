import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  catalogEntryKey,
  catalogOfSpecifier,
  computeAffected,
  diffCatalogs,
  matchesAny,
  packagesUsingCatalogEntries,
  parseCatalogs,
} from "./detect-affected.ts";

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

  it("declares the root catalog file", () => {
    expect(CONFIG.catalogPath).toBeTruthy();
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

// A `pnpm-workspace.yaml` shaped like the real one: quoted and bare keys, quoted
// and bare values, comments, a named catalog, and non-catalog top-level blocks.
const WORKSPACE_YAML = `packages:
  - packages/*
  - "!core/packages/http-client-python/**"

verifyDepsBeforeRun: false

overrides:
  "cross-spawn@>=7.0.0 <7.0.5": "^7.0.5"

catalog:
  "@typespec/http-client-python": ">=0.35.0 <1.0.0"
  # Pinned to 2.9.14: keep the comment out of the catalog
  turbo: "2.9.14"
  yaml: ^2.8.3

catalogs:
  legacy:
    react: ^17.0.0

allowBuilds:
  "@scarf/scarf": false
`;

describe("parseCatalogs", () => {
  it("reads the default catalog, ignoring comments and quoting", () => {
    const def = parseCatalogs(WORKSPACE_YAML).get("default");
    expect(Object.fromEntries(def!)).toEqual({
      "@typespec/http-client-python": ">=0.35.0 <1.0.0",
      turbo: "2.9.14",
      yaml: "^2.8.3",
    });
  });

  it("reads named catalogs", () => {
    expect(Object.fromEntries(parseCatalogs(WORKSPACE_YAML).get("legacy")!)).toEqual({
      react: "^17.0.0",
    });
  });

  it("ignores non-catalog blocks", () => {
    const catalogs = parseCatalogs(WORKSPACE_YAML);
    expect([...catalogs.keys()].sort()).toEqual(["default", "legacy"]);
    for (const entries of catalogs.values()) {
      expect(entries.has("cross-spawn@>=7.0.0 <7.0.5")).toBe(false);
      expect(entries.has("@scarf/scarf")).toBe(false);
    }
  });
});

describe("diffCatalogs", () => {
  const bump = (from: string, to: string) => WORKSPACE_YAML.replace(from, to);

  it("reports an edited version", () => {
    const head = bump('">=0.35.0 <1.0.0"', '">=0.35.1 <1.0.0"');
    expect([...diffCatalogs(WORKSPACE_YAML, head)]).toEqual([
      catalogEntryKey("default", "@typespec/http-client-python"),
    ]);
  });

  it("reports an added entry", () => {
    const head = bump("  yaml: ^2.8.3\n", "  yaml: ^2.8.3\n  semver: ^7.7.4\n");
    expect([...diffCatalogs(WORKSPACE_YAML, head)]).toEqual([catalogEntryKey("default", "semver")]);
  });

  it("reports a removed entry", () => {
    const head = bump("  yaml: ^2.8.3\n", "");
    expect([...diffCatalogs(WORKSPACE_YAML, head)]).toEqual([catalogEntryKey("default", "yaml")]);
  });

  it("reports changes in named catalogs", () => {
    const head = bump("react: ^17.0.0", "react: ^17.0.2");
    expect([...diffCatalogs(WORKSPACE_YAML, head)]).toEqual([catalogEntryKey("legacy", "react")]);
  });

  it("reports nothing when only non-catalog blocks change", () => {
    const head = bump("verifyDepsBeforeRun: false", "verifyDepsBeforeRun: true");
    expect(diffCatalogs(WORKSPACE_YAML, head).size).toBe(0);
  });

  it("reports nothing when the file is untouched", () => {
    expect(diffCatalogs(WORKSPACE_YAML, WORKSPACE_YAML).size).toBe(0);
  });

  it("treats every entry as changed when the base file did not exist", () => {
    expect(diffCatalogs(undefined, WORKSPACE_YAML).size).toBe(4);
  });
});

describe("catalogOfSpecifier", () => {
  it("maps `catalog:` and `catalog:default` to the default catalog", () => {
    expect(catalogOfSpecifier("catalog:")).toBe("default");
    expect(catalogOfSpecifier("catalog:default")).toBe("default");
  });

  it("maps `catalog:<name>` to that catalog", () => {
    expect(catalogOfSpecifier("catalog:legacy")).toBe("legacy");
  });

  it("returns undefined for non-catalog specifiers", () => {
    expect(catalogOfSpecifier("^1.0.0")).toBeUndefined();
    expect(catalogOfSpecifier("workspace:~")).toBeUndefined();
  });
});

describe("packagesUsingCatalogEntries", () => {
  const manifests = [
    { name: "emitter", dependencies: { "@typespec/http-client-python": "catalog:" } },
    { name: "pinned", dependencies: { "@typespec/http-client-python": "0.35.0" } },
    { name: "dev-only", devDependencies: { turbo: "catalog:" } },
    { name: "named", peerDependencies: { react: "catalog:legacy" } },
    { name: "unrelated", dependencies: { yaml: "catalog:" } },
  ];

  it("finds consumers across every dependency group", () => {
    const changed = new Set([
      catalogEntryKey("default", "@typespec/http-client-python"),
      catalogEntryKey("default", "turbo"),
      catalogEntryKey("legacy", "react"),
    ]);
    expect([...packagesUsingCatalogEntries(manifests, changed)].sort()).toEqual([
      "dev-only",
      "emitter",
      "named",
    ]);
  });

  it("ignores packages that pin the dependency instead of using the catalog", () => {
    const changed = new Set([catalogEntryKey("default", "@typespec/http-client-python")]);
    expect([...packagesUsingCatalogEntries(manifests, changed)]).toEqual(["emitter"]);
  });

  it("does not match the same dependency in a different catalog", () => {
    const changed = new Set([catalogEntryKey("legacy", "turbo")]);
    expect(packagesUsingCatalogEntries(manifests, changed).size).toBe(0);
  });

  it("returns nothing when no catalog entry changed", () => {
    expect(packagesUsingCatalogEntries(manifests, new Set()).size).toBe(0);
  });
});

// Regression test for Azure/typespec-azure#5010: a PR that only bumps the
// `@typespec/http-client-python` catalog entry (plus the lockfile) must still
// trigger the Python target, even though pnpm reports no affected package.
describe("catalog bump end to end (issue #5010)", () => {
  it("triggers only the target that consumes the changed catalog entry", () => {
    const head = WORKSPACE_YAML.replace('">=0.35.0 <1.0.0"', '">=0.36.0 <1.0.0"');
    const changed = diffCatalogs(WORKSPACE_YAML, head);
    const consumers = packagesUsingCatalogEntries(
      [
        {
          name: CONFIG.targets.python.package,
          dependencies: { "@typespec/http-client-python": "catalog:" },
        },
        { name: CONFIG.targets.java.package, dependencies: { yaml: "catalog:" } },
      ],
      changed,
    );
    const affected = computeAffected(consumers, [CONFIG.catalogPath, "pnpm-lock.yaml"], CONFIG);
    expect(affected).toEqual(only("python"));
  });
});
