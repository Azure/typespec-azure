import { describe, expect, it } from "vitest";
import {
  comparatorFromOrder,
  defaultCompareVersions,
  earliestVersion,
} from "../../src/migrate/version-order.js";

describe("defaultCompareVersions", () => {
  it("orders by date ascending", () => {
    const versions = ["2025-01-01", "2023-01-01", "2024-06-01"];
    expect([...versions].sort(defaultCompareVersions)).toEqual([
      "2023-01-01",
      "2024-06-01",
      "2025-01-01",
    ]);
  });

  it("places a same-dated preview before its GA", () => {
    expect(defaultCompareVersions("2024-06-01-preview", "2024-06-01")).toBeLessThan(0);
  });
});

describe("comparatorFromOrder", () => {
  it("honors the explicit order", () => {
    const compare = comparatorFromOrder(["b", "a", "c"]);
    expect([...["a", "b", "c"]].sort(compare)).toEqual(["b", "a", "c"]);
  });
});

describe("earliestVersion", () => {
  it("returns the lowest version under the comparator", () => {
    expect(earliestVersion(["2024-06-01", "2023-01-01"], defaultCompareVersions)).toBe(
      "2023-01-01",
    );
  });

  it("returns undefined for an empty list", () => {
    expect(earliestVersion([], defaultCompareVersions)).toBeUndefined();
  });
});
