import type { Namespace } from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import { getVersioningMutators } from "@typespec/versioning";
import { describe, expect, it } from "vitest";
import {
  buildComparisonPairs,
  buildPhaseAPairs,
  buildPhaseBPairs,
  enumerateVersions,
  createVersionedView,
} from "../src/versions.js";
import { Tester } from "./test-host.js";

describe("version enumeration", () => {
  it("enumerates versions from a versioned service", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget { name: string; }

      op getWidget(): Widget;
    `);

    const results = enumerateVersions(program);
    expect(results).toHaveLength(1);
    expect(results[0].versions).toEqual(["2024-01-01", "2025-01-01"]);
  });

  it("returns empty array for non-versioned service", async () => {
    const { program } = await Tester.compile(`
      @service
      namespace TestService;

      model Widget { name: string; }
      op getWidget(): Widget;
    `);

    const results = enumerateVersions(program);
    expect(results).toHaveLength(0);
  });

  it("enumerates three versions in order", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2023-01-01", v2: "2024-01-01", v3: "2025-01-01" }

      model Widget { name: string; }
      op getWidget(): Widget;
    `);

    const results = enumerateVersions(program);
    expect(results[0].versions).toEqual(["2023-01-01", "2024-01-01", "2025-01-01"]);
  });

  it("enumerates multiple services", async () => {
    const { program } = await Tester.compile(`
      @versioned(WidgetVersions)
      @service
      namespace WidgetService {
        enum WidgetVersions { v1: "2024-01-01", v2: "2025-01-01" }
        model Widget { name: string; }
        op getWidget(): Widget;
      }

      @versioned(GadgetVersions)
      @service
      namespace GadgetService {
        enum GadgetVersions { v1: "2024-06-01" }
        model Gadget { id: string; }
        op getGadget(): Gadget;
      }
    `);

    const results = enumerateVersions(program);
    expect(results).toHaveLength(2);
    expect(results[0].versions).toEqual(["2024-01-01", "2025-01-01"]);
    expect(results[1].versions).toEqual(["2024-06-01"]);
  });
});

describe("version projection", () => {
  it("projects to a specific version - added member absent in v1", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @added(Versions.v2) description?: string;
      }

      op getWidget(): Widget;
    `);

    const results = enumerateVersions(program);
    const info = results[0];
    expect(info).toBeDefined();

    const v1View = createVersionedView(program, info.service, "2024-01-01");
    expect(v1View.version).toBe("2024-01-01");

    // In v1, Widget should NOT have description
    const v1Widget = getModelFromNamespace(v1View.versionedNamespace, "Widget");
    expect(v1Widget).toBeDefined();
    expect(v1Widget!.properties.has("description")).toBe(false);
    expect(v1Widget!.properties.has("name")).toBe(true);

    const v2View = createVersionedView(program, info.service, "2025-01-01");
    expect(v2View.version).toBe("2025-01-01");

    // In v2, Widget SHOULD have description
    const v2Widget = getModelFromNamespace(v2View.versionedNamespace, "Widget");
    expect(v2Widget).toBeDefined();
    expect(v2Widget!.properties.has("description")).toBe(true);
    expect(v2Widget!.properties.has("name")).toBe(true);
  });

  it("projects to a specific version - removed member absent in v2", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2) legacyField?: string;
      }

      op getWidget(): Widget;
    `);

    const results = enumerateVersions(program);
    const info = results[0];
    const v1View = createVersionedView(program, info.service, "2024-01-01");
    const v2View = createVersionedView(program, info.service, "2025-01-01");

    const v1Widget = getModelFromNamespace(v1View.versionedNamespace, "Widget");
    expect(v1Widget!.properties.has("legacyField")).toBe(true);

    const v2Widget = getModelFromNamespace(v2View.versionedNamespace, "Widget");
    expect(v2Widget!.properties.has("legacyField")).toBe(false);
  });

  it("throws for unknown version", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01" }
      model Widget { name: string; }
      op getWidget(): Widget;
    `);

    const results = enumerateVersions(program);
    const info = results[0];
    expect(() => createVersionedView(program, info.service, "9999-99-99")).toThrow(
      "Version '9999-99-99' not found",
    );
  });
});

describe("comparison pair construction", () => {
  describe("buildPhaseAPairs", () => {
    it("builds pairs for shared versions", () => {
      const pairs = buildPhaseAPairs(
        ["2024-01-01", "2025-01-01"],
        ["2024-01-01", "2025-01-01"],
      );
      expect(pairs).toHaveLength(2);
      expect(pairs[0]).toEqual({
        baseVersion: "2024-01-01",
        headVersion: "2024-01-01",
        phase: "same-version",
      });
      expect(pairs[1]).toEqual({
        baseVersion: "2025-01-01",
        headVersion: "2025-01-01",
        phase: "same-version",
      });
    });

    it("only includes versions present in both", () => {
      const pairs = buildPhaseAPairs(["2024-01-01"], ["2024-01-01", "2025-01-01"]);
      expect(pairs).toHaveLength(1);
      expect(pairs[0].baseVersion).toBe("2024-01-01");
    });

    it("returns empty when no shared versions", () => {
      const pairs = buildPhaseAPairs(["2023-01-01"], ["2025-01-01"]);
      expect(pairs).toHaveLength(0);
    });

    it("returns empty for empty inputs", () => {
      expect(buildPhaseAPairs([], [])).toHaveLength(0);
      expect(buildPhaseAPairs([], ["2024-01-01"])).toHaveLength(0);
      expect(buildPhaseAPairs(["2024-01-01"], [])).toHaveLength(0);
    });
  });

  describe("buildPhaseBPairs", () => {
    it("finds previous stable for a new version", () => {
      const pairs = buildPhaseBPairs(
        ["2024-01-01", "2025-01-01"],
        ["2025-01-01"], // candidate: new version
      );
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toEqual({
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      });
    });

    it("skips preview versions when finding previous stable", () => {
      const pairs = buildPhaseBPairs(
        ["2024-01-01", "2024-06-01-preview", "2025-01-01"],
        ["2025-01-01"],
      );
      expect(pairs).toHaveLength(1);
      expect(pairs[0].baseVersion).toBe("2024-01-01"); // skips preview
    });

    it("no pair if no previous stable version exists", () => {
      const pairs = buildPhaseBPairs(
        ["2024-01-01-preview", "2025-01-01"],
        ["2025-01-01"],
      );
      // 2024-01-01-preview is preview, so no stable before 2025-01-01
      expect(pairs).toHaveLength(0);
    });

    it("no pair for the first version (nothing precedes it)", () => {
      const pairs = buildPhaseBPairs(["2024-01-01"], ["2024-01-01"]);
      expect(pairs).toHaveLength(0);
    });

    it("handles single version with no candidates", () => {
      const pairs = buildPhaseBPairs(["2024-01-01"], []);
      expect(pairs).toHaveLength(0);
    });

    it("handles empty version list", () => {
      const pairs = buildPhaseBPairs([], ["2024-01-01"]);
      expect(pairs).toHaveLength(0);
    });

    it("handles only preview versions — no pairs produced", () => {
      const pairs = buildPhaseBPairs(
        ["2024-01-01-preview", "2024-06-01-preview", "2025-01-01-preview"],
        ["2025-01-01-preview"],
      );
      // No stable versions exist, so no Phase B comparison is needed
      expect(pairs).toHaveLength(0);
    });

    it("multiple previews preceded by a stable", () => {
      const pairs = buildPhaseBPairs(
        ["2024-01-01", "2024-06-01-preview", "2024-09-01-preview", "2025-01-01"],
        ["2024-06-01-preview", "2024-09-01-preview", "2025-01-01"],
      );
      expect(pairs).toHaveLength(3);
      // All three compare back to the same stable: 2024-01-01
      expect(pairs[0]).toEqual({
        baseVersion: "2024-01-01",
        headVersion: "2024-06-01-preview",
        phase: "cross-version",
      });
      expect(pairs[1]).toEqual({
        baseVersion: "2024-01-01",
        headVersion: "2024-09-01-preview",
        phase: "cross-version",
      });
      expect(pairs[2]).toEqual({
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      });
    });

    it("multiple stable versions — each candidate finds nearest stable", () => {
      const pairs = buildPhaseBPairs(
        ["2023-01-01", "2024-01-01", "2025-01-01"],
        ["2024-01-01", "2025-01-01"],
      );
      expect(pairs).toHaveLength(2);
      expect(pairs[0]).toEqual({
        baseVersion: "2023-01-01",
        headVersion: "2024-01-01",
        phase: "cross-version",
      });
      expect(pairs[1]).toEqual({
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      });
    });

    it("custom classifier overrides default", () => {
      const customClassifier = (v: string) =>
        v.includes("beta") ? ("preview" as const) : ("stable" as const);

      const pairs = buildPhaseBPairs(
        ["2024-01-01", "2024-06-01-beta", "2025-01-01"],
        ["2025-01-01"],
        customClassifier,
      );
      expect(pairs).toHaveLength(1);
      expect(pairs[0].baseVersion).toBe("2024-01-01"); // skips beta
    });

    it("candidate not in headVersions is ignored", () => {
      const pairs = buildPhaseBPairs(
        ["2024-01-01", "2025-01-01"],
        ["9999-01-01"], // not in headVersions
      );
      expect(pairs).toHaveLength(0);
    });
  });

  describe("buildComparisonPairs (combined)", () => {
    it("produces Phase A and Phase B for new version in head", () => {
      const pairs = buildComparisonPairs(
        ["2024-01-01"],
        ["2024-01-01", "2025-01-01"],
      );

      const phaseA = pairs.filter((p) => p.phase === "same-version");
      expect(phaseA).toHaveLength(1);
      expect(phaseA[0].baseVersion).toBe("2024-01-01");

      const phaseB = pairs.filter((p) => p.phase === "cross-version");
      expect(phaseB).toHaveLength(1);
      expect(phaseB[0]).toEqual({
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      });
    });

    it("no Phase B when all versions are shared (no new versions)", () => {
      const pairs = buildComparisonPairs(
        ["2024-01-01", "2025-01-01"],
        ["2024-01-01", "2025-01-01"],
      );

      const phaseB = pairs.filter((p) => p.phase === "cross-version");
      expect(phaseB).toHaveLength(0); // no new versions = no Phase B from static analysis
    });

    it("new preview version with no preceding stable produces no Phase B", () => {
      const pairs = buildComparisonPairs([], ["2024-01-01-preview"]);
      expect(pairs).toHaveLength(0);
    });
  });
});

// Helper to find a model in a namespace
function getModelFromNamespace(ns: Namespace, modelName: string) {
  return ns.models.get(modelName);
}
