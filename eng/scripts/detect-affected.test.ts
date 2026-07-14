import assert from "node:assert/strict";
import test from "node:test";
import { CONFIG, computeAffected, matchesAny } from "./detect-affected.ts";

const NONE = new Set<string>();

// --- matchesAny (exact path or `dir/**` prefix) ----------------------------

test("matchesAny: `dir/**` matches the dir and anything under it", () => {
  const g = ".github/actions/setup/**";
  assert.equal(matchesAny(".github/actions/setup", [g]), true);
  assert.equal(matchesAny(".github/actions/setup/action.yml", [g]), true);
  assert.equal(matchesAny(".github/actions/setup/nested/x.ts", [g]), true);
  // Must NOT leak into a sibling dir that shares the prefix.
  assert.equal(matchesAny(".github/actions/setup-python/action.yml", [g]), false);
});

test("matchesAny: exact path matches only that path", () => {
  const g = ".github/workflows/ci-python.yml";
  assert.equal(matchesAny(".github/workflows/ci-python.yml", [g]), true);
  assert.equal(matchesAny(".github/workflows/ci-java.yml", [g]), false);
  // An exact pattern is not a prefix: a deeper path must not match.
  assert.equal(matchesAny(".github/workflows/ci-python.yml/extra", [g]), false);
});

test("matchesAny: true if any pattern matches", () => {
  const pats = [".github/workflows/ci-python.yml", ".github/actions/setup-python/**"];
  assert.equal(matchesAny(".github/actions/setup-python/action.yml", pats), true);
  assert.equal(matchesAny(".github/workflows/ci-java.yml", pats), false);
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

test("core submodule bump triggers all targets", () => {
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
