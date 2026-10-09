import { describe, expect, it } from "vitest";
import {
  getSpecOptions,
  isSpecEnabled,
  parseSpectorConfig,
  resolveSpecs,
  SpectorConfigError,
} from "../src/index.js";

describe("parseSpectorConfig", () => {
  it("parses true / false / options / omitted entries", () => {
    const config = parseSpectorConfig(`
specs:
  azure/core/basic: true
  azure/payload/pageable: false
  type/enum/extensible:
    options:
      namespace: type.enums.extensible
`);
    expect(config.specs["azure/core/basic"]).toBe(true);
    expect(config.specs["azure/payload/pageable"]).toBe(false);
    expect(config.specs["type/enum/extensible"]).toEqual({
      options: { namespace: "type.enums.extensible" },
    });
    expect(config.specs["not/listed"]).toBeUndefined();
  });

  it("accepts string, number, and boolean option values", () => {
    const config = parseSpectorConfig(`
specs:
  a:
    options:
      name: foo
      count: 3
      flag: true
`);
    expect(config.specs["a"]).toEqual({ options: { name: "foo", count: 3, flag: true } });
  });

  it("allows an entry object with no options", () => {
    const config = parseSpectorConfig(`
specs:
  a: {}
`);
    expect(config.specs["a"]).toEqual({ options: {} });
  });

  it("throws when root is not a map", () => {
    expect(() => parseSpectorConfig(`- a\n- b`)).toThrow(SpectorConfigError);
  });

  it("throws when specs is missing or not a map", () => {
    expect(() => parseSpectorConfig(`other: 1`)).toThrow(SpectorConfigError);
    expect(() => parseSpectorConfig(`specs: 1`)).toThrow(SpectorConfigError);
  });

  it("throws on an invalid entry value", () => {
    expect(() => parseSpectorConfig(`specs:\n  a: "yes"`)).toThrow(SpectorConfigError);
    expect(() => parseSpectorConfig(`specs:\n  a: [1]`)).toThrow(SpectorConfigError);
  });

  it("throws on unknown entry keys", () => {
    expect(() => parseSpectorConfig(`specs:\n  a:\n    skip: true`)).toThrow(SpectorConfigError);
  });

  it("throws on a non-scalar option value", () => {
    expect(() => parseSpectorConfig(`specs:\n  a:\n    options:\n      x: [1, 2]`)).toThrow(
      SpectorConfigError,
    );
  });
});

describe("isSpecEnabled / getSpecOptions", () => {
  const config = parseSpectorConfig(`
specs:
  run: true
  withOpts:
    options:
      k: v
  skipped: false
`);

  it("reports enabled state", () => {
    expect(isSpecEnabled(config, "run")).toBe(true);
    expect(isSpecEnabled(config, "withOpts")).toBe(true);
    expect(isSpecEnabled(config, "skipped")).toBe(false);
    expect(isSpecEnabled(config, "omitted")).toBe(false);
  });

  it("returns options only for enabled specs", () => {
    expect(getSpecOptions(config, "run")).toEqual([{}]);
    expect(getSpecOptions(config, "withOpts")).toEqual([{ k: "v" }]);
    expect(getSpecOptions(config, "skipped")).toBeUndefined();
    expect(getSpecOptions(config, "omitted")).toBeUndefined();
  });
});

describe("multiple option-sets (list value)", () => {
  const config = parseSpectorConfig(`
specs:
  azure/versioning/previewVersion:
    - options: { module: preview, api-version: 2024-12-01-preview }
    - options: { module: specific, api-version: 2024-06-01 }
`);

  it("parses a list of option-sets", () => {
    expect(config.specs["azure/versioning/previewVersion"]).toEqual([
      { options: { module: "preview", "api-version": "2024-12-01-preview" } },
      { options: { module: "specific", "api-version": "2024-06-01" } },
    ]);
  });

  it("resolves to one entry per option-set", () => {
    expect(resolveSpecs(config)).toEqual([
      {
        path: "azure/versioning/previewVersion",
        options: { module: "preview", "api-version": "2024-12-01-preview" },
      },
      {
        path: "azure/versioning/previewVersion",
        options: { module: "specific", "api-version": "2024-06-01" },
      },
    ]);
  });

  it("throws on an empty list", () => {
    expect(() => parseSpectorConfig(`specs:\n  a: []`)).toThrow(SpectorConfigError);
  });
});

describe("resolveSpecs", () => {
  it("returns only enabled specs, sorted, with options", () => {
    const config = parseSpectorConfig(`
specs:
  b/second: true
  a/first:
    options:
      k: v
  c/skipped: false
`);
    expect(resolveSpecs(config)).toEqual([
      { path: "a/first", options: { k: "v" } },
      { path: "b/second", options: {} },
    ]);
  });
});
