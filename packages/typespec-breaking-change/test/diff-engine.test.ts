import { describe, expect, it } from "vitest";
import { computeDiffs } from "../src/diff-engine.js";
import type { ApiDiff, VersionedView } from "../src/types.js";
import { createVersionedView, enumerateVersions } from "../src/versions.js";
import { Tester } from "./test-host.js";

describe("computeDiffs", () => {
  describe("operation diffs", () => {
    it("detects operation added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget { name: string; }

        @route("/widgets")
        @get
        op listWidgets(): Widget[];

        @added(Versions.v2)
        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);

      expect(diffs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "OperationAdded",
            identity: expect.objectContaining({
              operation: expect.objectContaining({
                method: "GET",
                path: "/widgets/{}",
              }),
            }),
          }),
        ]),
      );
    });

    it("detects operation removed", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget { name: string; }

        @route("/widgets")
        @get
        op listWidgets(): Widget[];

        @removed(Versions.v2)
        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);

      expect(diffs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "OperationRemoved",
            identity: expect.objectContaining({
              operation: expect.objectContaining({
                method: "GET",
                path: "/widgets/{}",
              }),
            }),
          }),
        ]),
      );
    });
  });

  describe("property diffs", () => {
    it("detects required request property added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @added(Versions.v2) age: int32;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestPropertyAdded",
          "body.properties.age",
        ),
      ).toBeDefined();
    });

    it("detects optional request property added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @added(Versions.v2) age?: int32;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestPropertyAdded",
          "body.properties.age",
        ),
      ).toBeDefined();
    });

    it("detects removed request and response properties", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @removed(Versions.v2) legacy?: string;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      const diffs = computeDiffs(baseView, headView).diffs;
      expect(findDiff(diffs, "RequestPropertyRemoved", "body.properties.legacy")).toBeDefined();
      expect(findDiff(diffs, "ResponsePropertyRemoved", "body.properties.legacy")).toBeDefined();
    });

    it("detects property type changed", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          @typeChangedFrom(Versions.v2, string)
          count: int32;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      const diffs = computeDiffs(baseView, headView).diffs;
      expect(findDiff(diffs, "RequestPropertyTypeChanged", "body.properties.count")).toBeDefined();
      expect(findDiff(diffs, "ResponsePropertyTypeChanged", "body.properties.count")).toBeDefined();
    });

    it("detects property made optional", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @madeOptional(Versions.v2) description?: string;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      const diffs = computeDiffs(baseView, headView).diffs;
      expect(
        findDiff(diffs, "RequestPropertyMadeOptional", "body.properties.description"),
      ).toBeDefined();
      expect(
        findDiff(diffs, "ResponsePropertyMadeOptional", "body.properties.description"),
      ).toBeDefined();
    });
  });

  describe("parameter diffs", () => {
    it("detects query parameter added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget { name: string; }

        @route("/widgets")
        @get
        op listWidgets(@query filter?: string, @added(Versions.v2) @query limit?: int32): Widget[];
      `);

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestQueryParameterAdded",
          "query.limit",
        ),
      ).toBeDefined();
    });

    it("detects query parameter removed", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget { name: string; }

        @route("/widgets")
        @get
        op listWidgets(@query filter?: string, @removed(Versions.v2) @query limit?: int32): Widget[];
      `);

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestQueryParameterRemoved",
          "query.limit",
        ),
      ).toBeDefined();
    });

    it("detects header parameter added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget { name: string; }

        @route("/widgets")
        @get
        op listWidgets(@added(Versions.v2) @header("x-custom") custom?: string): Widget[];
      `);

      expect(
        findDiff(computeDiffs(baseView, headView).diffs, "RequestHeaderAdded", "headers.x-custom"),
      ).toBeDefined();
    });
  });

  describe("type diffs", () => {
    it("detects enum member added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        enum Status {
          Active,
          @added(Versions.v2) Suspended,
        }

        model Widget {
          name: string;
          status: Status;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "EnumerationMemberAdded",
          "body.properties.status.Suspended",
        ),
      ).toBeDefined();
    });
  });

  describe("cycle detection", () => {
    it("handles self-referencing models without infinite recursion", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model TreeNode {
          name: string;
          children?: TreeNode[];
          @added(Versions.v2) depth?: int32;
        }

        @route("/tree")
        @get
        op getTree(): TreeNode;
      `);

      const diffs = computeDiffs(baseView, headView).diffs;
      expect(findDiff(diffs, "ResponsePropertyAdded", "body.properties.depth")).toBeDefined();
    });
  });

  describe("baseline", () => {
    it("returns no diffs when versions have the same wire shape", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget { name: string; }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      expect(computeDiffs(baseView, headView).diffs).toHaveLength(0);
    });
  });
});

async function compileViews(spec: string): Promise<{
  baseView: VersionedView;
  headView: VersionedView;
}> {
  const normalizedSpec = spec.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");
  const { program } = await Tester.compile(normalizedSpec);
  const [service] = enumerateVersions(program);

  expect(service).toBeDefined();
  expect(service.versions).toHaveLength(2);

  return {
    baseView: createVersionedView(program, service.service, service.versions[0]),
    headView: createVersionedView(program, service.service, service.versions[1]),
  };
}

function findDiff(diffs: ApiDiff[], kind: string, element?: string): ApiDiff | undefined {
  return diffs.find(
    (diff) =>
      diff.kind === kind &&
      ("operation" in diff.identity || "element" in diff.identity) &&
      (element === undefined || diff.identity.element === element),
  );
}
