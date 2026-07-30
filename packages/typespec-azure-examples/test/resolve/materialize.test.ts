import { describe, expect, it } from "vitest";
import { substituteApiVersion } from "../../src/resolve/materialize.js";

describe("substituteApiVersion", () => {
  it("replaces the placeholder in nested strings", () => {
    const input = {
      responses: { "200": { body: { nextLink: "https://h/x?api-version={api-version}" } } },
    };
    expect(substituteApiVersion(input, "2024-06-01")).toEqual({
      responses: { "200": { body: { nextLink: "https://h/x?api-version=2024-06-01" } } },
    });
  });

  it("replaces multiple occurrences and recurses into arrays", () => {
    expect(substituteApiVersion(["{api-version}", "a/{api-version}/{api-version}"], "v1")).toEqual([
      "v1",
      "a/v1/v1",
    ]);
  });

  it("leaves non-string values untouched", () => {
    expect(substituteApiVersion({ n: 1, b: true, z: null }, "v1")).toEqual({
      n: 1,
      b: true,
      z: null,
    });
  });
});
