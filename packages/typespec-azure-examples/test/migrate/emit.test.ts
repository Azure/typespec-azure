import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  buildExamplesObject,
  type OperationEntry,
  planFiles,
  serializeExamplesYaml,
} from "../../src/migrate/emit.js";

const entries: OperationEntry[] = [
  {
    operationKey: "Things.get",
    variants: [
      { since: "2024-06-01", request: { path: { id: "1" } }, responses: { "200": { body: {} } } },
    ],
  },
  {
    operationKey: "Widgets.list",
    variants: [{ request: {}, responses: { "200": { body: {} } } }],
  },
];

describe("serializeExamplesYaml", () => {
  it("force-quotes since and keeps status codes as integer keys on round-trip", () => {
    const yaml = serializeExamplesYaml(buildExamplesObject(entries, "Microsoft.Test"));
    expect(yaml).toContain('since: "2024-06-01"');
    // Status codes emit as bare integer keys, not quoted strings.
    expect(yaml).toMatch(/\n\s+200:/);
    expect(yaml).not.toContain('"200"');

    const parsed = parse(yaml);
    expect(parsed.$namespace).toBe("Microsoft.Test");
    // Integer status keys survive the round-trip as numbers.
    expect(Object.keys(parsed["Things.get"][0].responses)).toEqual(["200"]);
    expect(typeof parsed["Things.get"][0].since).toBe("string");
  });
});

describe("planFiles", () => {
  it("emits a single examples.yaml by default", () => {
    const files = planFiles(entries, "Microsoft.Test");
    expect(files.map((f) => f.path)).toEqual(["examples.yaml"]);
  });

  it("splits by interface when requested", () => {
    const files = planFiles(entries, "Microsoft.Test", { splitByInterface: true });
    expect(files.map((f) => f.path).sort()).toEqual([
      "examples/Things.yaml",
      "examples/Widgets.yaml",
    ]);
  });

  it("auto-splits above the threshold", () => {
    expect(planFiles(entries, undefined, { autoSplitThreshold: 1 }).length).toBe(2);
    expect(planFiles(entries, undefined, { autoSplitThreshold: 5 }).length).toBe(1);
  });
});
