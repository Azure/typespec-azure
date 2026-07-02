import { describe, expect, it } from "vitest";
import {
  resolveOperationIdentities,
  normalizePath,
  getOperationIdentity,
  identityKey,
} from "../src/operation-identity.js";
import { matchOperations } from "../src/match.js";
import { enumerateVersions, createVersionedView } from "../src/versions.js";
import { Tester } from "./test-host.js";

describe("normalizePath", () => {
  it("replaces parameter names with {}", () => {
    expect(normalizePath("/widgets/{widgetId}")).toBe("/widgets/{}");
  });

  it("handles multiple parameters", () => {
    expect(
      normalizePath(
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Foo/bars/{barName}",
      ),
    ).toBe("/subscriptions/{}/resourceGroups/{}/providers/Microsoft.Foo/bars/{}");
  });

  it("handles path with no parameters", () => {
    expect(normalizePath("/widgets")).toBe("/widgets");
  });

  it("handles empty path", () => {
    expect(normalizePath("")).toBe("");
  });
});

describe("resolveOperationIdentities", () => {
  it("extracts operations with correct identity", async () => {
    const { program } = await Tester.compile(`
      @service
      namespace TestService;

      model Widget { @key id: string; name: string; }

      @route("/widgets")
      interface Widgets {
        @get list(): Widget[];
        @get read(@path id: string): Widget;
        @post create(@body widget: Widget): Widget;
      }
    `);

    const services = await import("@typespec/compiler").then((m) => m.listServices(program));
    const ops = resolveOperationIdentities(program, services[0].type);

    expect(ops.operations.size).toBe(3);
    expect(ops.operations.has("GET /widgets")).toBe(true);
    expect(ops.operations.has("GET /widgets/{}")).toBe(true);
    expect(ops.operations.has("POST /widgets")).toBe(true);
  });

  it("handles ARM-style nested paths", async () => {
    const { program } = await Tester.compile(`
      @service
      namespace TestService;

      @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Foo/bars/{barName}")
      interface Bars {
        @get read(@path subscriptionId: string, @path resourceGroupName: string, @path barName: string): {};
      }
    `);

    const services = await import("@typespec/compiler").then((m) => m.listServices(program));
    const ops = resolveOperationIdentities(program, services[0].type);

    const key = "GET /subscriptions/{}/resourceGroups/{}/providers/Microsoft.Foo/bars/{}";
    expect(ops.operations.has(key)).toBe(true);

    const op = ops.operations.get(key)!;
    expect(op.identity.method).toBe("GET");
    expect(op.identity.path).toBe(
      "/subscriptions/{}/resourceGroups/{}/providers/Microsoft.Foo/bars/{}",
    );
  });

  it("preserves operation name for debugging", async () => {
    const { program } = await Tester.compile(`
      @service
      namespace TestService;

      @route("/things")
      interface Things {
        @get listThings(): string[];
      }
    `);

    const services = await import("@typespec/compiler").then((m) => m.listServices(program));
    const ops = resolveOperationIdentities(program, services[0].type);

    const op = ops.operations.get("GET /things")!;
    expect(op.identity.name).toBe("listThings");
  });
});

describe("matchOperations", () => {
  it("matches operations by identity", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget { name: string; }

      @route("/widgets")
      interface Widgets {
        @get list(): Widget[];
        @get read(@path id: string): Widget;
      }
    `);

    const info = enumerateVersions(program);
    const v1 = createVersionedView(program, info!.service, "2024-01-01");
    const v2 = createVersionedView(program, info!.service, "2025-01-01");

    const baseOps = resolveOperationIdentities(program, v1.versionedNamespace);
    const headOps = resolveOperationIdentities(program, v2.versionedNamespace);

    const result = matchOperations(baseOps, headOps);
    expect(result.matched).toHaveLength(2);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it("detects added operations", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget { name: string; }

      @route("/widgets")
      interface Widgets {
        @get list(): Widget[];
        @added(Versions.v2) @delete remove(@path id: string): void;
      }
    `);

    const info = enumerateVersions(program);
    const v1 = createVersionedView(program, info!.service, "2024-01-01");
    const v2 = createVersionedView(program, info!.service, "2025-01-01");

    const baseOps = resolveOperationIdentities(program, v1.versionedNamespace);
    const headOps = resolveOperationIdentities(program, v2.versionedNamespace);

    const result = matchOperations(baseOps, headOps);
    expect(result.matched).toHaveLength(1); // list
    expect(result.added).toHaveLength(1);
    expect(result.added[0].identity.method).toBe("DELETE");
    expect(result.removed).toHaveLength(0);
  });

  it("detects removed operations", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget { name: string; }

      @route("/widgets")
      interface Widgets {
        @get list(): Widget[];
        @removed(Versions.v2) @put update(@path id: string, @body w: Widget): Widget;
      }
    `);

    const info = enumerateVersions(program);
    const v1 = createVersionedView(program, info!.service, "2024-01-01");
    const v2 = createVersionedView(program, info!.service, "2025-01-01");

    const baseOps = resolveOperationIdentities(program, v1.versionedNamespace);
    const headOps = resolveOperationIdentities(program, v2.versionedNamespace);

    const result = matchOperations(baseOps, headOps);
    expect(result.matched).toHaveLength(1); // list
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].identity.method).toBe("PUT");
    expect(result.added).toHaveLength(0);
  });

  it("handles empty operation sets", () => {
    const emptyMap = { operations: new Map() };
    const result = matchOperations(emptyMap, emptyMap);
    expect(result.matched).toHaveLength(0);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });
});
