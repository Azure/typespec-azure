import { describe, expect, it } from "vitest";
import { normalizeApiVersion, normalizeApiVersions } from "../../src/migrate/normalize.js";

describe("normalizeApiVersion", () => {
  it("replaces the version inside string values", () => {
    const input = {
      nextLink: "https://host/things?api-version=2024-06-01",
      headers: { Location: "https://host/op/1?api-version=2024-06-01" },
    };
    expect(normalizeApiVersion(input, "2024-06-01")).toEqual({
      nextLink: "https://host/things?api-version={api-version}",
      headers: { Location: "https://host/op/1?api-version={api-version}" },
    });
  });

  it("leaves non-string values untouched", () => {
    expect(normalizeApiVersion({ count: 3, ok: true }, "2024-06-01")).toEqual({
      count: 3,
      ok: true,
    });
  });

  it("recurses through arrays", () => {
    expect(normalizeApiVersion(["a?api-version=2024-06-01"], "2024-06-01")).toEqual([
      "a?api-version={api-version}",
    ]);
  });
});

describe("normalizeApiVersions", () => {
  it("normalizes any of several versions, preferring the longest match", () => {
    const input = { a: "v=2024-06-01-preview", b: "v=2024-06-01" };
    expect(normalizeApiVersions(input, ["2024-06-01", "2024-06-01-preview"])).toEqual({
      a: "v={api-version}",
      b: "v={api-version}",
    });
  });
});
