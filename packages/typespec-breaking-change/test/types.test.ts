import { describe, expect, it } from "vitest";
import type { ApiDiff, DiffKind, Finding } from "../src/index.js";

describe("core types", () => {
  it("DiffKind can be assigned from string literals", () => {
    const kind: DiffKind = "RequestPropertyRemoved";
    expect(kind).toBe("RequestPropertyRemoved");
  });

  it("ApiDiff structure is valid", () => {
    const diff: ApiDiff = {
      kind: "ResponsePropertyRemoved",
      sourcePath: {
        file: {} as any,
        pos: 100,
        end: 120,
        declarationName: "legacyStatus",
      },
      origin: {
        target: {} as any,
        sourcePath: {
          file: {} as any,
          pos: 100,
          end: 120,
          declarationName: "legacyStatus",
        },
      },
      message: "Response property 'legacyStatus' was removed from BarProperties",
      direction: "response",
      affectedOperations: [{ method: "GET", path: "/things/{thingId}", name: "getThing" }],
    };

    expect(diff.kind).toBe("ResponsePropertyRemoved");
    expect(diff.direction).toBe("response");
    expect(diff.affectedOperations).toHaveLength(1);
    expect(diff.origin.sourcePath.declarationName).toBe("legacyStatus");
  });

  it("Finding structure wraps ApiDiff with classification", () => {
    const finding: Finding = {
      diff: {
        kind: "RequestPropertyMadeRequired",
        sourcePath: { file: {} as any, pos: 50, end: 80 },
        origin: { target: {} as any, sourcePath: { file: {} as any, pos: 50, end: 80 } },
        message: "Property 'name' made required",
        direction: "request",
        affectedOperations: [{ method: "PUT", path: "/widgets/{id}", name: "createWidget" }],
      },
      severity: "error",
      rule: "RequestPropertyMadeRequired",
      phase: "cross-version",
      suppressed: false,
      versionPair: {
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      },
    };

    expect(finding.severity).toBe("error");
    expect(finding.phase).toBe("cross-version");
    expect(finding.suppressed).toBe(false);
    expect(finding.versionPair.baseVersion).toBe("2024-01-01");
  });
});
