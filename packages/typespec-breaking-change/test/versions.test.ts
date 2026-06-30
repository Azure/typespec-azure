import type { Namespace } from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import { getVersioningMutators } from "@typespec/versioning";
import { describe, expect, it } from "vitest";
import { buildComparisonPairs, enumerateVersions, createVersionedView } from "../src/versions.js";
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

    const info = enumerateVersions(program);
    expect(info).toBeDefined();
    expect(info!.versions).toEqual(["2024-01-01", "2025-01-01"]);
  });

  it("returns undefined for non-versioned service", async () => {
    const { program } = await Tester.compile(`
      @service
      namespace TestService;

      model Widget { name: string; }
      op getWidget(): Widget;
    `);

    const info = enumerateVersions(program);
    expect(info).toBeUndefined();
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

    const info = enumerateVersions(program);
    expect(info!.versions).toEqual(["2023-01-01", "2024-01-01", "2025-01-01"]);
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

    const info = enumerateVersions(program);
    expect(info).toBeDefined();

    const v1View = createVersionedView(program, info!.service, "2024-01-01");
    expect(v1View.version).toBe("2024-01-01");

    // In v1, Widget should NOT have description
    const v1Widget = getModelFromNamespace(v1View.versionedNamespace, "Widget");
    expect(v1Widget).toBeDefined();
    expect(v1Widget!.properties.has("description")).toBe(false);
    expect(v1Widget!.properties.has("name")).toBe(true);

    const v2View = createVersionedView(program, info!.service, "2025-01-01");
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

    const info = enumerateVersions(program);
    const v1View = createVersionedView(program, info!.service, "2024-01-01");
    const v2View = createVersionedView(program, info!.service, "2025-01-01");

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

    const info = enumerateVersions(program);
    expect(() => createVersionedView(program, info!.service, "9999-99-99")).toThrow(
      "Version '9999-99-99' not found",
    );
  });
});

describe("comparison pair construction", () => {
  it("builds Phase A pairs for shared versions", () => {
    const pairs = buildComparisonPairs(
      ["2024-01-01", "2025-01-01"],
      ["2024-01-01", "2025-01-01"],
    );

    const phaseA = pairs.filter((p) => p.phase === "same-version");
    expect(phaseA).toHaveLength(2);
    expect(phaseA[0]).toEqual({
      baseVersion: "2024-01-01",
      headVersion: "2024-01-01",
      phase: "same-version",
    });
    expect(phaseA[1]).toEqual({
      baseVersion: "2025-01-01",
      headVersion: "2025-01-01",
      phase: "same-version",
    });
  });

  it("builds Phase B pairs for consecutive head versions", () => {
    const pairs = buildComparisonPairs(
      ["2024-01-01", "2025-01-01"],
      ["2024-01-01", "2025-01-01"],
    );

    const phaseB = pairs.filter((p) => p.phase === "cross-version");
    expect(phaseB).toHaveLength(1);
    expect(phaseB[0]).toEqual({
      baseVersion: "2024-01-01",
      headVersion: "2025-01-01",
      phase: "cross-version",
    });
  });

  it("handles head having a new version not in base", () => {
    const pairs = buildComparisonPairs(
      ["2024-01-01"],
      ["2024-01-01", "2025-01-01"],
    );

    const phaseA = pairs.filter((p) => p.phase === "same-version");
    expect(phaseA).toHaveLength(1); // only 2024-01-01 is shared
    expect(phaseA[0].baseVersion).toBe("2024-01-01");

    const phaseB = pairs.filter((p) => p.phase === "cross-version");
    expect(phaseB).toHaveLength(1);
    expect(phaseB[0]).toEqual({
      baseVersion: "2024-01-01",
      headVersion: "2025-01-01",
      phase: "cross-version",
    });
  });

  it("handles three versions", () => {
    const pairs = buildComparisonPairs(
      ["2023-01-01", "2024-01-01", "2025-01-01"],
      ["2023-01-01", "2024-01-01", "2025-01-01"],
    );

    const phaseA = pairs.filter((p) => p.phase === "same-version");
    expect(phaseA).toHaveLength(3);

    const phaseB = pairs.filter((p) => p.phase === "cross-version");
    expect(phaseB).toHaveLength(2);
    expect(phaseB[0].baseVersion).toBe("2023-01-01");
    expect(phaseB[0].headVersion).toBe("2024-01-01");
    expect(phaseB[1].baseVersion).toBe("2024-01-01");
    expect(phaseB[1].headVersion).toBe("2025-01-01");
  });

  it("returns empty when no shared versions and only one head version", () => {
    const pairs = buildComparisonPairs([], ["2025-01-01"]);
    expect(pairs.filter((p) => p.phase === "same-version")).toHaveLength(0);
    expect(pairs.filter((p) => p.phase === "cross-version")).toHaveLength(0);
  });
});

// Helper to find a model in a namespace
function getModelFromNamespace(ns: Namespace, modelName: string) {
  return ns.models.get(modelName);
}
