import { describe, expect, it } from "vitest";
import {
  diffKindCatalog,
  diffKinds,
  getDiffKindCatalogEntry,
  phaseBRuleCatalog,
} from "../src/index.js";

describe("diff kind catalog", () => {
  it("has exactly one entry for every DiffKind", () => {
    expect(diffKindCatalog.map((entry) => entry.kind)).toEqual(diffKinds);
    expect(new Set(diffKindCatalog.map((entry) => entry.kind)).size).toBe(diffKinds.length);
  });

  it("keeps policy metadata synchronized with the policy engine", () => {
    for (const entry of diffKindCatalog) {
      expect({
        severity: entry.phaseBSeverity,
        rule: entry.phaseBRule,
      }).toEqual(phaseBRuleCatalog[entry.kind]);
    }
  });

  it("requires every supported kind to identify its producer", () => {
    const supported = diffKindCatalog.filter((entry) => entry.status !== "declared-only");

    expect(supported.length).toBeGreaterThan(0);
    expect(supported.every((entry) => entry.producer !== undefined)).toBe(true);
  });

  it("records source kinds for derived resource findings", () => {
    expect(getDiffKindCatalogEntry("ResourcePropertyRemoved")).toMatchObject({
      status: "derived",
      producer: "pipeline/orchestrator.mergeRequestResponseToResource",
      sourceKinds: ["RequestPropertyRemoved", "ResponsePropertyRemoved"],
    });
  });

  it("does not present taxonomy-only kinds as implemented", () => {
    for (const kind of [
      "RequestEncodingChanged",
      "AuthSchemeRemoved",
      "ResourcePropertyRenamed",
    ] as const) {
      const entry = getDiffKindCatalogEntry(kind);
      expect(entry.status).toBe("declared-only");
      expect(entry).not.toHaveProperty("producer");
    }
  });
});
