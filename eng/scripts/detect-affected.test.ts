import assert from "node:assert/strict";
import test from "node:test";
import {
  CONFIG,
  computeAffected,
  filterIgnored,
  globToRegExp,
  mapFilesToPackages,
  matchesAny,
} from "./detect-affected.ts";

const NONE = new Set<string>();

// --- globToRegExp / matchesAny --------------------------------------------

test("globToRegExp: ** matches across path segments", () => {
  assert.equal(globToRegExp("**/test/**").test("packages/tcgc/test/a/b.test.ts"), true);
  assert.equal(globToRegExp("**/test/**").test("test/a.ts"), true);
  assert.equal(globToRegExp("**/test/**").test("packages/tcgc/src/a.ts"), false);
});

test("globToRegExp: **/*.md matches markdown at any depth", () => {
  assert.equal(globToRegExp("**/*.md").test("README.md"), true);
  assert.equal(globToRegExp("**/*.md").test("packages/x/CHANGELOG.md"), true);
  assert.equal(globToRegExp("**/*.md").test("packages/x/src/a.ts"), false);
});

test("globToRegExp: prefix/** matches only under that exact directory", () => {
  const g = ".github/actions/setup/**";
  assert.equal(globToRegExp(g).test(".github/actions/setup/action.yml"), true);
  // Must NOT leak into a sibling dir that shares the prefix.
  assert.equal(globToRegExp(g).test(".github/actions/setup-python/action.yml"), false);
});

test("globToRegExp: exact path (no wildcards) matches exactly", () => {
  const g = ".github/workflows/ci-python.yml";
  assert.equal(globToRegExp(g).test(".github/workflows/ci-python.yml"), true);
  assert.equal(globToRegExp(g).test(".github/workflows/ci-java.yml"), false);
});

test("matchesAny: true if any glob matches", () => {
  assert.equal(matchesAny("a/b.md", ["**/test/**", "**/*.md"]), true);
  assert.equal(matchesAny("a/b.ts", ["**/test/**", "**/*.md"]), false);
});

// --- filterIgnored ---------------------------------------------------------

test("filterIgnored: drops test and markdown files", () => {
  const files = [
    "packages/tcgc/src/index.ts",
    "packages/tcgc/test/foo.test.ts",
    "packages/tcgc/README.md",
  ];
  assert.deepEqual(filterIgnored(files, CONFIG.ignore), ["packages/tcgc/src/index.ts"]);
});

test("filterIgnored: a test-only change leaves no meaningful files", () => {
  const files = ["packages/tcgc/test/a.test.ts", "packages/tcgc/test/b.test.ts"];
  assert.deepEqual(filterIgnored(files, CONFIG.ignore), []);
});

// --- mapFilesToPackages ----------------------------------------------------

const pkgs = [
  { name: "@root", dir: "" },
  { name: "@tcgc", dir: "packages/typespec-client-generator-core" },
  { name: "@python", dir: "packages/typespec-python" },
];

test("mapFilesToPackages: maps a file to its containing package (longest dir)", () => {
  const r = mapFilesToPackages(["packages/typespec-client-generator-core/src/index.ts"], pkgs);
  assert.deepEqual([...r], ["@tcgc"]);
});

test("mapFilesToPackages: ignores the repo-root package", () => {
  assert.deepEqual([...mapFilesToPackages([".github/workflows/ci-python.yml"], pkgs)], []);
  assert.deepEqual([...mapFilesToPackages(["eng/scripts/detect-affected.ts"], pkgs)], []);
});

test("mapFilesToPackages: submodule pointer maps to nothing", () => {
  assert.deepEqual([...mapFilesToPackages(["core"], pkgs)], []);
});

// --- computeAffected -------------------------------------------------------

test("target affected when its own package is in the affected set", () => {
  const r = computeAffected(new Set(["@azure-tools/typespec-python"]), [], CONFIG);
  assert.deepEqual(r, { python: true, java: false, typescript: false });
});

test("all emitters affected when they appear as graph dependents", () => {
  const all = new Set([
    "@azure-tools/typespec-python",
    "@azure-tools/typespec-java",
    "@azure-tools/typespec-ts",
  ]);
  assert.deepEqual(computeAffected(all, [], CONFIG), {
    python: true,
    java: true,
    typescript: true,
  });
});

test("nothing affected with no packages and no files", () => {
  assert.deepEqual(computeAffected(NONE, [], CONFIG), {
    python: false,
    java: false,
    typescript: false,
  });
});

test("target CI workflow change triggers only that target", () => {
  assert.deepEqual(computeAffected(NONE, [".github/workflows/ci-python.yml"], CONFIG), {
    python: true,
    java: false,
    typescript: false,
  });
});

test("target setup action change triggers only that target", () => {
  assert.deepEqual(computeAffected(NONE, [".github/actions/setup-java/action.yml"], CONFIG), {
    python: false,
    java: true,
    typescript: false,
  });
});

test("shared setup action change triggers all targets", () => {
  assert.deepEqual(computeAffected(NONE, [".github/actions/setup/action.yml"], CONFIG), {
    python: true,
    java: true,
    typescript: true,
  });
});

test("core submodule bump triggers all coreSubmodule targets", () => {
  assert.deepEqual(computeAffected(NONE, ["core"], CONFIG), {
    python: true,
    java: true,
    typescript: true,
  });
});

test("unrelated root file change triggers nothing", () => {
  assert.deepEqual(computeAffected(NONE, ["README.md", "package.json"], CONFIG), {
    python: false,
    java: false,
    typescript: false,
  });
});
