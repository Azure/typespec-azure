import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { computeAffected, loadConfig, resolveTarget } from "./detect-affected.js";

/** @type {import("./detect-affected.js").Config} */
const config = {
  defaults: { ignore: ["**/test/**", "**/*.md", "**/CHANGELOG.md"] },
  groups: { "core-libs": ["packages/typespec-client-generator-core/**"] },
  targets: {
    python: { self: "packages/typespec-python/**", use: ["core-libs"], coreSubmodule: true },
    java: { self: "packages/typespec-java/**", coreSubmodule: false },
  },
};

test("self change affects only that target", () => {
  const r = computeAffected(["packages/typespec-python/src/index.ts"], config);
  assert.equal(r.python, true);
  assert.equal(r.java, false);
});

test("upstream group change affects dependents", () => {
  const r = computeAffected(["packages/typespec-client-generator-core/src/x.ts"], config);
  assert.equal(r.python, true);
});

test("test-only upstream change is ignored", () => {
  const r = computeAffected(["packages/typespec-client-generator-core/test/x.test.ts"], config);
  assert.equal(r.python, false);
});

test("docs-only upstream change is ignored", () => {
  const r = computeAffected(["packages/typespec-client-generator-core/README.md"], config);
  assert.equal(r.python, false);
});

test("core submodule bump affects only core-submodule targets", () => {
  const r = computeAffected(["core"], config);
  assert.equal(r.python, true);
  assert.equal(r.java, false);
});

test("unrelated change affects nothing", () => {
  const r = computeAffected(["README.md"], config);
  assert.equal(r.python, false);
  assert.equal(r.java, false);
});

test("resolveTarget throws on unknown group", () => {
  const bad = /** @type {any} */ ({
    groups: {},
    targets: { x: { self: "a/**", use: ["nope"] } },
  });
  assert.throws(() => resolveTarget(bad, "x"), /unknown group "nope"/);
});

// --- Contract tests against the real committed config file ---
const realConfig = loadConfig(
  join(dirname(fileURLToPath(import.meta.url)), "..", "ci", "downstream-deps.yml"),
);

test("real config: a language setup action change triggers only that emitter", () => {
  const r = computeAffected([".github/actions/setup-python/action.yml"], realConfig);
  assert.equal(r.python, true);
  assert.equal(r.java, false);
  assert.equal(r.typescript, false);
});

test("real config: an emitter's own workflow file change triggers only that emitter", () => {
  const r = computeAffected([".github/workflows/ci-java.yml"], realConfig);
  assert.equal(r.java, true);
  assert.equal(r.python, false);
  assert.equal(r.typescript, false);
});

test("real config: the shared setup action change triggers all emitters", () => {
  const r = computeAffected([".github/actions/setup/action.yml"], realConfig);
  assert.equal(r.python, true);
  assert.equal(r.java, true);
  assert.equal(r.typescript, true);
});

test("real config: a core-libs (tcgc) source change triggers all emitters", () => {
  const r = computeAffected(
    ["packages/typespec-client-generator-core/src/decorators.ts"],
    realConfig,
  );
  assert.equal(r.python, true);
  assert.equal(r.java, true);
  assert.equal(r.typescript, true);
});

test("real config: a core-libs test-only change triggers nothing", () => {
  const r = computeAffected(
    ["packages/typespec-client-generator-core/test/foo.test.ts"],
    realConfig,
  );
  assert.equal(r.python, false);
  assert.equal(r.java, false);
  assert.equal(r.typescript, false);
});

test("real config: a core submodule bump triggers all emitters", () => {
  const r = computeAffected(["core"], realConfig);
  assert.equal(r.python, true);
  assert.equal(r.java, true);
  assert.equal(r.typescript, true);
});
