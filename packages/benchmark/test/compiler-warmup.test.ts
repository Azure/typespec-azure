import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { measureCompiler } from "../src/compile.js";
import type { BenchmarkPlan } from "../src/types.js";

it("warms the measured process, creates fresh Programs and isolates successive workloads", async () => {
  const dir = await mkdtemp(join(tmpdir(), "benchmark-warmup-"));
  try {
    const events = join(dir, "events.jsonl");
    await writeFile(
      join(dir, "main.tsp"),
      'import "./validator.mjs"; model Sample { value: string; }',
    );
    await writeFile(
      join(dir, "validator.mjs"),
      `import { appendFileSync } from "node:fs";
       let calls = 0;
       const programs = new WeakSet();
       export function $onValidate(program) {
         if (programs.has(program)) throw new Error("Program was reused");
         programs.add(program);
         appendFileSync(${JSON.stringify(events)}, JSON.stringify({ pid: process.pid, call: ++calls }) + "\\n");
       }`,
    );
    const workload = { id: "sample-compiler", spec: "sample", kind: "compiler" } as const;
    const plan: BenchmarkPlan = {
      id: "warmup",
      commit: "test",
      commitTimestamp: "2026-10-15T00:00:00Z",
      specs: [{ name: "sample", dir, emitters: [] }],
      workloads: [workload],
      compiler: { iterations: 3, warmup: 2, maxReruns: 0, rerunIterations: 1 },
      emitter: { iterations: 1, warmup: 0 },
    };
    const worker = fileURLToPath(new URL("../dist/src/measure-compiler.js", import.meta.url));
    const first = await measureCompiler(dir, plan, workload, worker);
    const second = await measureCompiler(dir, plan, workload, worker);
    expect(first.warmup).toBe(2);
    expect(first.rawIterations).toHaveLength(3);
    expect(second.rawIterations).toHaveLength(3);
    const recorded: { pid: number; call: number }[] = (await readFile(events, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(recorded.map((event) => event.call)).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    expect(new Set(recorded.slice(0, 5).map((event) => event.pid)).size).toBe(1);
    expect(new Set(recorded.slice(5).map((event) => event.pid)).size).toBe(1);
    expect(recorded[0].pid).not.toBe(recorded[5].pid);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
