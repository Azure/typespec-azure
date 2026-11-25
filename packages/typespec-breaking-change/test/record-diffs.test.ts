import { describe, expect, it } from "vitest";
import { analyzeProgram } from "../src/pipeline/orchestrator.js";
import { TesterWithSuppressions } from "./test-host.js";

describe("record comparisons", () => {
  it.each([
    ["Record<string>", "Record<int32>", "ResourcePropertyTypeChanged"],
    ["Record<string>", "Record<string>", undefined],
    ["Record<string>", "string[]", "ResourcePropertyTypeChanged"],
    ["Record<string>", "Array<string>", "ResourcePropertyTypeChanged"],
    ["Array<string>", "Record<string>", "ResourcePropertyTypeChanged"],
    ["Array<string>", "Array<string>", undefined],
    ["Array<string>", "string[]", undefined],
    ["string[]", "Array<string>", undefined],
    ["Record<string>", "{}", "ResourcePropertyTypeChanged"],
  ])("compares %s to %s", async (base, head, expectedKind) => {
    const { program } = await TesterWithSuppressions.compile(`
      @service @versioned(Versions) namespace Test;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      model Widget {
        @typeChangedFrom(Versions.v2, ${base})
        tags: ${head};
      }
      @route("/widgets") @post op create(@body widget: Widget): Widget;
    `);
    const result = analyzeProgram(program);
    expect(result.findings.map((finding) => finding.diff.kind)).toEqual(
      expectedKind ? [expectedKind] : [],
    );
    if (expectedKind) {
      expect(result.findings[0].diff.identity.element).toBe("body.properties.tags");
      expect(result.findings[0].diff.origin?.declarationPath).toBe("Test.Widget.tags");
    }
  });

  it("compares nested record values and supports approval on the owning property", async () => {
    const { program } = await TesterWithSuppressions.compile(`
      @service @versioned(Versions) namespace Test;
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      model Widget {
        @approvedBreakingChange("Reviewed.", #{ kind: "ResourcePropertyTypeChanged" })
        @typeChangedFrom(Versions.v2, Record<Record<string>>)
        tags: Record<Record<int32>>;
      }
      @route("/widgets") @post op create(@body widget: Widget): Widget;
    `);
    const result = analyzeProgram(program);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      suppressed: true,
      suppressionReason: "Reviewed.",
      diff: { kind: "ResourcePropertyTypeChanged", identity: { element: "body.properties.tags" } },
    });
  });
});
