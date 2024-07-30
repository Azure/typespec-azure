import { describe, expect, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";

describe("typespec-client-generator-core: usage flags", () => {
  it("all possible values in UsageFlags should be orthogonal", async () => {
    const values = Object.values(UsageFlags).filter(
      (value) => typeof value === "number"
    ) as number[];

    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        expect(values[i] & values[j]).toBe(0);
      }
    }
  });
});
