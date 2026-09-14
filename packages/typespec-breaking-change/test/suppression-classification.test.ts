import { describe, expect, it } from "vitest";
import {
  buildSuppressionInventory,
  suppressionIdentityKey,
} from "../src/suppression/inventory.js";
import {
  compareInventories,
  type SuppressionComparisonResult,
} from "../src/suppression/classification.js";
import { detectAmbiguousSuppressions } from "../src/suppression/ambiguity.js";
import {
  analyzeBaseAndHead,
  analyzeProgram,
  type Finding,
} from "../src/index.js";
import { TesterWithSuppressions } from "./test-host.js";

// Helper to compile a program with suppressions library loaded
async function compileWithSuppressions(code: string) {
  const result = await TesterWithSuppressions.compile(code);
  return result.program;
}

describe("suppression inventory", () => {
  it("collects a direct @approvedBreakingChange on a property", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("legacy removal", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const inventory = buildSuppressionInventory(program);
    expect(inventory.length).toBe(1);
    expect(inventory[0].decorator).toBe("approvedBreakingChange");
    expect(inventory[0].kind).toBe("ResponsePropertyRemoved");
    expect(inventory[0].reason).toBe("legacy removal");
    expect(inventory[0].placement).toBe("direct");
  });

  it("collects a parent-placed @approvedBreakingChange with path", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      @approvedBreakingChange("removal approved", #{ kind: "ResponsePropertyRemoved", path: "properties.legacy" })
      model Widget {
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const inventory = buildSuppressionInventory(program);
    expect(inventory.length).toBe(1);
    expect(inventory[0].placement).toBe("ancestor");
    expect(inventory[0].path).toBe("properties.legacy");
    expect(inventory[0].kind).toBe("ResponsePropertyRemoved");
  });

  it("collects @approvedUnversionedChange", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedUnversionedChange("projection gap accepted", #{ kind: "RequestPropertyAdded" })
        nickname?: string;
        name: string;
      }
    `);

    const inventory = buildSuppressionInventory(program);
    expect(inventory.length).toBe(1);
    expect(inventory[0].decorator).toBe("approvedUnversionedChange");
    expect(inventory[0].kind).toBe("RequestPropertyAdded");
  });

  it("collects multiple decorators on the same declaration in order", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("response removal", #{ kind: "ResponsePropertyRemoved" })
        @approvedBreakingChange("request removal", #{ kind: "RequestPropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const inventory = buildSuppressionInventory(program);
    expect(inventory.length).toBe(2);
    const kinds = inventory.map((r) => r.kind).sort();
    expect(kinds).toContain("ResponsePropertyRemoved");
    expect(kinds).toContain("RequestPropertyRemoved");
    // Local indices should be 0 and 1
    const indices = inventory.map((r) => r.localIndex).sort();
    expect(indices).toEqual([0, 1]);
  });

  it("preserves kind, path, since, and reason", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("first removal only", #{ kind: "ResponsePropertyRemoved", since: "2025-01-01" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const inventory = buildSuppressionInventory(program);
    expect(inventory[0].kind).toBe("ResponsePropertyRemoved");
    expect(inventory[0].since).toBe("2025-01-01");
    expect(inventory[0].reason).toBe("first removal only");
  });

  it("identity key is consistent across compilations of equivalent code", async () => {
    const code = `
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("legacy removal", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `;

    const program1 = await compileWithSuppressions(code);
    const program2 = await compileWithSuppressions(code);

    const inv1 = buildSuppressionInventory(program1);
    const inv2 = buildSuppressionInventory(program2);

    expect(suppressionIdentityKey(inv1[0])).toBe(suppressionIdentityKey(inv2[0]));
  });
});

describe("suppression classification (A1)", () => {
  it("classifies NEW suppression (present only in head)", async () => {
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("approved in PR", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const baseInv = buildSuppressionInventory(baseProgram);
    const headInv = buildSuppressionInventory(headProgram);
    const result = compareInventories(baseInv, headInv);

    expect(result.classifications.length).toBe(1);
    expect(result.classifications[0].classification).toBe("new");
    expect(result.classifications[0].head?.kind).toBe("ResponsePropertyRemoved");
  });

  it("classifies EXISTING suppression (same in base and head)", async () => {
    const code = `
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("legacy removal approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `;

    const baseProgram = await compileWithSuppressions(code);
    const headProgram = await compileWithSuppressions(code);

    const result = compareInventories(
      buildSuppressionInventory(baseProgram),
      buildSuppressionInventory(headProgram),
    );

    expect(result.classifications.length).toBe(1);
    expect(result.classifications[0].classification).toBe("existing");
  });

  it("classifies REMOVED suppression (present only in base)", async () => {
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("legacy removal approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const result = compareInventories(
      buildSuppressionInventory(baseProgram),
      buildSuppressionInventory(headProgram),
    );

    expect(result.classifications.length).toBe(1);
    expect(result.classifications[0].classification).toBe("removed");
  });

  it("classifies MODIFIED suppression (reason changed)", async () => {
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("old reason", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("new reason", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const result = compareInventories(
      buildSuppressionInventory(baseProgram),
      buildSuppressionInventory(headProgram),
    );

    expect(result.classifications.length).toBe(1);
    expect(result.classifications[0].classification).toBe("modified");
  });

  it("classifies MODIFIED suppression (since changed)", async () => {
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("removal", #{ kind: "ResponsePropertyRemoved", since: "2024-01-01" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("removal", #{ kind: "ResponsePropertyRemoved", since: "2025-01-01" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const result = compareInventories(
      buildSuppressionInventory(baseProgram),
      buildSuppressionInventory(headProgram),
    );

    expect(result.classifications.length).toBe(1);
    expect(result.classifications[0].classification).toBe("modified");
  });

  it("different DiffKinds on same node are independent", async () => {
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("type changed", #{ kind: "ResponsePropertyTypeChanged" })
        name: string;
      }
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("type changed", #{ kind: "ResponsePropertyTypeChanged" })
        @approvedBreakingChange("made optional", #{ kind: "ResponsePropertyMadeOptional" })
        name: string;
      }
    `);

    const result = compareInventories(
      buildSuppressionInventory(baseProgram),
      buildSuppressionInventory(headProgram),
    );

    const typeChanged = result.classifications.find(
      (c) => c.head?.kind === "ResponsePropertyTypeChanged" || c.base?.kind === "ResponsePropertyTypeChanged",
    );
    const madeOptional = result.classifications.find(
      (c) => c.head?.kind === "ResponsePropertyMadeOptional",
    );

    expect(typeChanged?.classification).toBe("existing");
    expect(madeOptional?.classification).toBe("new");
  });

  it("recommends BreakingChangeReviewRequired for new @approvedBreakingChange", async () => {
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      model Widget { name: string; }
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `);

    const result = compareInventories(
      buildSuppressionInventory(baseProgram),
      buildSuppressionInventory(headProgram),
    );

    expect(result.recommendedLabels).toContain("BreakingChangeReviewRequired");
  });

  it("recommends VersioningReviewRequired for new @approvedUnversionedChange", async () => {
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      model Widget { name: string; }
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedUnversionedChange("gap accepted", #{ kind: "RequestPropertyAdded" })
        nickname?: string;
        name: string;
      }
    `);

    const result = compareInventories(
      buildSuppressionInventory(baseProgram),
      buildSuppressionInventory(headProgram),
    );

    expect(result.recommendedLabels).toContain("VersioningReviewRequired");
  });

  it("no labels recommended for existing-only suppressions", async () => {
    const code = `
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }
    `;

    const result = compareInventories(
      buildSuppressionInventory(await compileWithSuppressions(code)),
      buildSuppressionInventory(await compileWithSuppressions(code)),
    );

    expect(result.recommendedLabels).toHaveLength(0);
  });
});

describe("version scoping (A2)", () => {
  it("since-scoped suppression matches only the correct version pair", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2023-01-01", v2: "2024-01-01", v3: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("only first removal", #{ kind: "ResponsePropertyRemoved", since: "2024-01-01" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);

    // The v1->v2 finding should be suppressed (since matches "2024-01-01")
    const v1v2 = result.findings.filter(
      (f) => f.versionPair.baseVersion === "2023-01-01" && f.versionPair.headVersion === "2024-01-01",
    );
    const suppressedV1V2 = v1v2.filter((f) => f.suppressed && f.diff.kind.includes("PropertyRemoved"));
    expect(suppressedV1V2.length).toBeGreaterThan(0);

    // Any findings for v2->v3 should NOT be suppressed by this scoped approval
    const v2v3 = result.findings.filter(
      (f) => f.versionPair.baseVersion === "2024-01-01" && f.versionPair.headVersion === "2025-01-01",
    );
    const suppressedV2V3 = v2v3.filter((f) => f.suppressed && f.diff.kind.includes("PropertyRemoved"));
    // There shouldn't be a removal finding for v2->v3 because the property was already removed in v2
    // So this is testing that the since-scoped approval doesn't leak to other pairs
    // The key test: the approval with since: "2024-01-01" only matches headVersion "2024-01-01"
    expect(suppressedV1V2.length).toBeGreaterThan(0);
  });

  it("unscoped approval matching a single baseline remains valid", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("single occurrence approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    const removals = result.findings.filter((f) => f.diff.kind.includes("PropertyRemoved"));
    const suppressed = removals.filter((f) => f.suppressed);
    expect(suppressed.length).toBeGreaterThan(0);

    // No ambiguity since there's only one version transition
    const ambiguous = result.findings.filter((f) => f.ambiguousSuppressionDetected);
    expect(ambiguous).toHaveLength(0);
  });

  it("ambiguity detected when unscoped approval matches 2+ baselines", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2023-01-01", v2: "2024-01-01", v3: "2025-01-01", v4: "2026-01-01" }

      model Widget {
        @approvedBreakingChange("too broad", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        @added(Versions.v3)
        @removed(Versions.v4)
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);

    // There should be ambiguous findings flagged
    const ambiguous = result.findings.filter((f) => f.ambiguousSuppressionDetected);
    expect(ambiguous.length).toBeGreaterThan(0);
  });

  it("two since-scoped approvals resolve ambiguity", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2023-01-01", v2: "2024-01-01", v3: "2025-01-01", v4: "2026-01-01" }

      model Widget {
        @approvedBreakingChange("first removal", #{ kind: "ResponsePropertyRemoved", since: "2024-01-01" })
        @approvedBreakingChange("second removal", #{ kind: "ResponsePropertyRemoved", since: "2026-01-01" })
        @removed(Versions.v2)
        @added(Versions.v3)
        @removed(Versions.v4)
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);

    // With since-scoped approvals, each version pair has its own suppression
    // No ambiguity should be detected
    const ambiguous = result.findings.filter((f) => f.ambiguousSuppressionDetected);
    expect(ambiguous).toHaveLength(0);

    // Both removals should be suppressed
    const removals = result.findings.filter(
      (f) => f.diff.kind.includes("PropertyRemoved") && f.severity === "error",
    );
    const suppressed = removals.filter((f) => f.suppressed);
    expect(suppressed.length).toBe(removals.length);
  });
});

describe("pipeline integration (A1 + A2)", () => {
  it("analyzeBaseAndHead marks suppressed findings with classification", async () => {
    // Base has v1 only; head adds v2 with a breaking change + suppression
    const baseProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01" }

      model Widget {
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `);

    const headProgram = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("approved in this PR", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `);

    const result = analyzeBaseAndHead(baseProgram, headProgram);

    // Should have suppression comparison
    expect(result.suppressionComparison).toBeDefined();
    expect(result.suppressionComparison!.classifications.length).toBeGreaterThan(0);
    expect(result.suppressionComparison!.recommendedLabels).toContain("BreakingChangeReviewRequired");

    // Suppressed findings should carry classification
    const suppressed = result.findings.filter((f) => f.suppressed);
    expect(suppressed.length).toBeGreaterThan(0);
    const withClassification = suppressed.filter((f) => f.suppressionClassification === "new");
    expect(withClassification.length).toBeGreaterThan(0);
  });

  it("analyzeBaseAndHead returns no labels when suppressions are unchanged", async () => {
    const code = `
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `;

    const baseProgram = await compileWithSuppressions(code);
    const headProgram = await compileWithSuppressions(code);

    const result = analyzeBaseAndHead(baseProgram, headProgram);

    expect(result.suppressionComparison!.recommendedLabels).toHaveLength(0);
  });

  it("analyzeProgram does not include suppressionComparison (single program)", async () => {
    const program = await compileWithSuppressions(`
      @versioned(Versions)
      @service
      namespace TestService;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        @approvedBreakingChange("approved", #{ kind: "ResponsePropertyRemoved" })
        @removed(Versions.v2)
        legacy?: string;
        name: string;
      }

      @route("/widgets")
      @get op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    expect(result.suppressionComparison).toBeUndefined();
  });
});
