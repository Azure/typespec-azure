import { expect, it } from "vitest";
import { aggregateDurations } from "../src/aggregate.js";

it("aggregateDurations uses trimmed mean for 5+ samples", () => {
  const actual = aggregateDurations([100, 101, 102, 103, 1000]);
  expect(actual).toBe(102);
});

it("aggregateDurations uses median for fewer than 5 samples", () => {
  const actual = aggregateDurations([100, 101, 1000]);
  expect(actual).toBe(101);
});
