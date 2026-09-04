import { expect, it } from "vitest";
import { buildHistory, HISTORY_VERSION } from "../src/generate-history.js";
import type { BenchmarkResult, RunnerInfo, SpecBenchmarkResult } from "../src/types.js";

interface SpecOptions {
  total: number;
  iterations?: number;
  cv?: number;
}

function spec({ total, iterations = 25, cv }: SpecOptions): SpecBenchmarkResult {
  return {
    name: "sample",
    iterations,
    rawIterations: [],
    stats: {
      complexity: { createdTypes: 0, finishedTypes: 0 },
      runtime: {
        total,
        loader: 0,
        resolver: 0,
        checker: 0,
        validation: { total: 0, validators: {} },
        linter: { total: 0, rules: {} },
        emit: { total: 0, emitters: {} },
      },
    },
    ...(cv === undefined
      ? {}
      : {
          variability: {
            total: {
              mean: total,
              median: total,
              stdDev: total * cv,
              cv,
              min: total,
              max: total,
              sampleCount: iterations,
            },
          },
        }),
  } as SpecBenchmarkResult;
}

const LINUX: RunnerInfo = { os: "linux-6.11.0", nodeVersion: "v24.15.0", arch: "x64" };

interface RunOptions extends SpecOptions {
  day: number;
  runner?: RunnerInfo;
}

function run({ day, runner = LINUX, ...specOptions }: RunOptions): {
  name: string;
  content: string;
} {
  const result: BenchmarkResult = {
    commit: `commit-${day}`,
    timestamp: new Date(Date.UTC(2026, 0, day)).toISOString(),
    runner,
    specs: { sample: spec(specOptions) },
  } as BenchmarkResult;
  return { name: `commit-${day}.json`, content: JSON.stringify(result) };
}

/** A steady series long enough for the outlier window to have neighbors. */
function steadySeries(count: number, total = 100) {
  return Array.from({ length: count }, (_, i) => run({ day: i + 1, total }));
}

it("buildHistory stamps the schema version", () => {
  const history = buildHistory(steadySeries(3));
  expect(history.version).toBe(HISTORY_VERSION);
});

it("buildHistory carries the runner through to each entry", () => {
  const history = buildHistory(steadySeries(3));
  expect(history.entries[0].runner).toEqual(LINUX);
});

it("buildHistory records iteration count and spread per entry", () => {
  const history = buildHistory([run({ day: 1, total: 100, iterations: 25, cv: 0.02 })]);
  expect(history.entries[0].quality.iterations).toBe(25);
  expect(history.entries[0].quality.cv).toBe(0.02);
});

it("buildHistory reports no spread for runs measured before it was recorded", () => {
  const history = buildHistory([run({ day: 1, total: 100 })]);
  expect(history.entries[0].quality.cv).toBeNull();
});

it("buildHistory leaves comparable entries unflagged", () => {
  const history = buildHistory(steadySeries(11));
  expect(history.entries.every((entry) => entry.quality.flags.length === 0)).toBe(true);
});

it("buildHistory flags runs averaged over too few iterations", () => {
  const history = buildHistory([run({ day: 1, total: 100, iterations: 1 })]);
  expect(history.entries[0].quality.flags).toContain("low-iterations");
});

it("buildHistory flags runs measured on a different platform than the rest", () => {
  const files = steadySeries(10);
  files.push(
    run({
      day: 11,
      total: 100,
      runner: { os: "darwin-25.4.0", nodeVersion: "v24.15.0", arch: "arm64" },
    }),
  );
  const history = buildHistory(files);
  expect(history.entries.at(-1)!.quality.flags).toContain("foreign-runner");
  expect(history.entries[0].quality.flags).not.toContain("foreign-runner");
});

it("buildHistory ignores kernel version differences on the same platform", () => {
  const files = steadySeries(10);
  files.push(
    run({
      day: 11,
      total: 100,
      runner: { os: "linux-6.14.0", nodeVersion: "v24.17.0", arch: "x64" },
    }),
  );
  const history = buildHistory(files);
  expect(history.entries.at(-1)!.quality.flags).not.toContain("foreign-runner");
});

it("buildHistory flags an isolated spike", () => {
  const files = steadySeries(11);
  files[5] = run({ day: 6, total: 900 });
  const history = buildHistory(files);
  expect(history.entries[5].quality.flags).toContain("outlier");
});

it("buildHistory flags an isolated dip", () => {
  const files = steadySeries(11);
  files[5] = run({ day: 6, total: 10 });
  const history = buildHistory(files);
  expect(history.entries[5].quality.flags).toContain("outlier");
});

it("buildHistory does not flag a change that persists", () => {
  const files = [
    ...steadySeries(12),
    ...Array.from({ length: 12 }, (_, i) => run({ day: i + 13, total: 300 })),
  ];
  const history = buildHistory(files);
  const flagged = history.entries.filter((entry) => entry.quality.flags.includes("outlier"));
  expect(flagged).toEqual([]);
});

it("buildHistory does not flag when there are too few neighbors to judge", () => {
  const history = buildHistory([run({ day: 1, total: 100 }), run({ day: 2, total: 900 })]);
  expect(history.entries[1].quality.flags).not.toContain("outlier");
});

it("buildHistory orders entries oldest first", () => {
  const history = buildHistory([run({ day: 3, total: 100 }), run({ day: 1, total: 100 })]);
  expect(history.entries.map((entry) => entry.commit)).toEqual(["commit-1", "commit-3"]);
});
