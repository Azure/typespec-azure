import assert from "node:assert/strict";
// eslint-disable-next-line vitest/no-import-node-test
import test from "node:test";
import { aggregateDurations } from "../src/aggregate.js";

test("aggregateDurations uses trimmed mean for 5+ samples", () => {
  const actual = aggregateDurations([100, 101, 102, 103, 1000]);
  assert.equal(actual, 102);
});

test("aggregateDurations uses median for fewer than 5 samples", () => {
  const actual = aggregateDurations([100, 101, 1000]);
  assert.equal(actual, 101);
});
