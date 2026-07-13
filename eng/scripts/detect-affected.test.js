// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { computeAffected, resolveTarget } from "./detect-affected.js";

/** @type {import("./detect-affected.js").Config} */
const config = {
  defaults: { ignore: ["**/test/**", "**/*.md", "**/CHANGELOG.md"] },
  groups: { "core-libs": ["packages/typespec-client-generator-core/**"] },
  targets: {
    python: { self: "packages/typespec-python/**", use: ["core-libs"], "core-submodule": true },
    java: { self: "packages/typespec-java/**", "core-submodule": false },
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
  const r = computeAffected(
    ["packages/typespec-client-generator-core/test/x.test.ts"],
    config,
  );
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
