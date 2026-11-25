import { describe, expect, it } from "vitest";
import { loadExampleFile, parseServiceVersions } from "../src/loader.js";
import { checkFilePlacement } from "../src/rules.js";

describe("checkFilePlacement", () => {
  it("rejects the same operation appearing in two files", () => {
    const a = loadExampleFile("examples/A.yaml", `Foo.get:\n  - request: {}\n    responses: {}\n`);
    const b = loadExampleFile("examples/B.yaml", `Foo.get:\n  - request: {}\n    responses: {}\n`);
    const codes = checkFilePlacement([a, b]).map((d) => d.code);
    expect(codes).toContain("operation-in-multiple-files");
  });

  it("rejects an interface split across files", () => {
    const a = loadExampleFile("examples/A.yaml", `Foo.get:\n  - request: {}\n    responses: {}\n`);
    const b = loadExampleFile("examples/B.yaml", `Foo.list:\n  - request: {}\n    responses: {}\n`);
    const codes = checkFilePlacement([a, b]).map((d) => d.code);
    expect(codes).toContain("interface-split-across-files");
  });

  it("accepts one interface per file", () => {
    const a = loadExampleFile(
      "examples/Foo.yaml",
      `Foo.get:\n  - request: {}\n    responses: {}\n`,
    );
    const b = loadExampleFile(
      "examples/Bar.yaml",
      `Bar.get:\n  - request: {}\n    responses: {}\n`,
    );
    expect(checkFilePlacement([a, b])).toEqual([]);
  });
});

describe("parseServiceVersions", () => {
  it("extracts version strings in order", () => {
    const result = parseServiceVersions(`
versions:
  - version: "2023-11-01"
    source: typespec
  - version: "2024-06-01"
    source: typespec
`);
    expect(result.versions).toEqual(["2023-11-01", "2024-06-01"]);
  });

  it("tolerates a missing versions list", () => {
    expect(parseServiceVersions("other: value").versions).toEqual([]);
  });
});
