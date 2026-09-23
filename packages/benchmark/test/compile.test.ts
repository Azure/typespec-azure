import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { compileSpec, validateEmitterStats } from "../src/compile.js";
import type { Stats } from "../src/types.js";

const stats: Stats = {
  complexity: { createdTypes: 1, finishedTypes: 1 },
  runtime: {
    total: 10,
    loader: 1,
    resolver: 2,
    checker: 3,
    validation: { total: 4, validators: {} },
    linter: { total: 0, rules: {} },
    emit: { total: 20, emitters: { emitter: { total: 20, steps: { generate: 15 } } } },
  },
};
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "benchmark-compile-test-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function runWorker(body: string) {
  const worker = join(dir, "worker.mjs");
  await writeFile(worker, `import { writeFileSync } from "node:fs";\n${body}`);
  return compileSpec(dir, worker);
}

it("separates emitter stdout from the stats channel", async () => {
  expect(
    await runWorker(
      `console.log("Generating SDK"); writeFileSync(3, ${JSON.stringify(JSON.stringify(stats))});`,
    ),
  ).toEqual(stats);
});

it("reports failed workers with the spec and emitter output", async () => {
  await expect(
    runWorker('console.error("C# generation failed"); process.exit(1);'),
  ).rejects.toThrow(
    new RegExp(`Compilation failed for .*benchmark-compile-test-.*C# generation failed`, "s"),
  );
});

it.each(["", "not json", "{}"])("rejects missing or malformed stats: %j", async (output) => {
  await expect(runWorker(`writeFileSync(3, ${JSON.stringify(output)});`)).rejects.toThrow(
    /Invalid benchmark stats/,
  );
});

it("fails when a configured emitter did not report a timing", () => {
  expect(() => validateEmitterStats(stats, ["emitter", "missing"])).toThrow(/missing/);
});

it.each([NaN, Infinity, -1])("rejects an invalid emitter timing: %s", (total) => {
  const invalid = structuredClone(stats);
  invalid.runtime.emit.emitters.emitter.total = total;
  expect(() => validateEmitterStats(invalid, ["emitter"])).toThrow(/emitter/);
});

it("accepts complete emitter timings, including zero", () => {
  const valid = structuredClone(stats);
  valid.runtime.emit.emitters.emitter.total = 0;
  expect(() => validateEmitterStats(valid, ["emitter"])).not.toThrow();
});
