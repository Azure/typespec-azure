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

  describe("source location tracing", () => {
    it("property added has correct head source location", async () => {
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

      const { diffs } = computeDiffs(baseView, headView);
      const addedDiff = findDiff(diffs, "RequestPropertyAdded", "body.properties.age");

      expect(addedDiff).toBeDefined();
      expect(addedDiff!.headSourceLocation).toBeDefined();
      expect(addedDiff!.headSourceLocation!.isSynthetic).not.toBe(true);

      const sourceText = addedDiff!.headSourceLocation!.file.text.substring(
        addedDiff!.headSourceLocation!.pos,
        addedDiff!.headSourceLocation!.end,
      );
      expect(sourceText).toContain("age");
      expect(addedDiff!.baseSourceLocation).toBeUndefined();
    });

    it("property removed has correct base source location", async () => {
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

      const { diffs } = computeDiffs(baseView, headView);
      const removedDiff = findDiff(diffs, "RequestPropertyRemoved", "body.properties.legacy");

      expect(removedDiff).toBeDefined();
      expect(removedDiff!.baseSourceLocation).toBeDefined();
      expect(removedDiff!.baseSourceLocation!.isSynthetic).not.toBe(true);

      const sourceText = removedDiff!.baseSourceLocation!.file.text.substring(
        removedDiff!.baseSourceLocation!.pos,
        removedDiff!.baseSourceLocation!.end,
      );
      expect(sourceText).toContain("legacy");
      expect(removedDiff!.headSourceLocation).toBeUndefined();
    });

    it("property type changed has both source locations", async () => {
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

      const { diffs } = computeDiffs(baseView, headView);
      const typeChangedDiff = findDiff(diffs, "RequestPropertyTypeChanged", "body.properties.count");

      expect(typeChangedDiff).toBeDefined();
      expect(typeChangedDiff!.baseSourceLocation).toBeDefined();
      expect(typeChangedDiff!.headSourceLocation).toBeDefined();
      expect(typeChangedDiff!.baseSourceLocation!.isSynthetic).not.toBe(true);
      expect(typeChangedDiff!.headSourceLocation!.isSynthetic).not.toBe(true);
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

  describe("decoration evolution", () => {
    it("doc decorator change produces no diffs", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;

          @removed(Versions.v2)
          @doc("The widget description in v1")
          @renamedFrom(Versions.v2, "description")
          descriptionV1?: string;

          @added(Versions.v2)
          @doc("The widget description, updated in v2")
          description?: string;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      expect(computeDiffs(baseView, headView).diffs).toHaveLength(0);
    });

    it("visibility decoration change adds property to request", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;

          @removed(Versions.v2)
          @visibility(Lifecycle.Read)
          @renamedFrom(Versions.v2, "status")
          statusV1?: string;

          @added(Versions.v2)
          status?: string;
        }

        @route("/widgets")
        @post
        op createWidget(@body widget: Widget): Widget;
      `);

      const diffs = computeDiffs(baseView, headView).diffs;

      expect(findDiff(diffs, "RequestPropertyAdded", "body.properties.status")).toBeDefined();
      expect(findDiff(diffs, "ResponsePropertyRemoved", "body.properties.status")).toBeUndefined();
    });
  });

  describe("encoding changes", () => {
    it("detects encoding change from utcDateTime to unixTimestamp int32", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;

          @removed(Versions.v2)
          @renamedFrom(Versions.v2, "createdAt")
          createdAtV1: utcDateTime;

          @added(Versions.v2)
          @encode("unixTimestamp", int32)
          createdAt: utcDateTime;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      const createdAtDiffs = diffs.filter((diff) => {
        if (!("operation" in diff.identity)) return false;
        return diff.identity.element.includes("createdAt");
      });

      expect(createdAtDiffs.length).toBeGreaterThan(0);
      expect(
        createdAtDiffs.some(
          (diff) =>
            diff.kind.includes("TypeChanged") ||
            diff.kind.includes("EncodingChanged") ||
            diff.kind.includes("TypeKindChanged"),
        ),
      ).toBe(true);
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

  describe("coverage gaps", () => {
    it("detects response header added", async () => {
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
        op getWidget(@path id: string): {
          @statusCode statusCode: 200;
          @body body: Widget;
          @added(Versions.v2) @header("x-request-id") requestId?: string;
        };
      `);

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "ResponseHeaderAdded")).toBeDefined();
    });

    it("detects response header removed", async () => {
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
        op getWidget(@path id: string): {
          @statusCode statusCode: 200;
          @body body: Widget;
          @removed(Versions.v2) @header("x-request-id") requestId?: string;
        };
      `);

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "ResponseHeaderRemoved")).toBeDefined();
    });

    it("detects response status code added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget { name: string; }
        model ErrorBody { message: string; }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string):
          { @statusCode statusCode: 200; @body body: Widget; } |
          { @added(Versions.v2) @statusCode statusCode: 404; @body body: ErrorBody; };
      `);

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "ResponseStatusCodeAdded")).toBeDefined();
    });

    it("detects response content type added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model WidgetResponse {
          @statusCode statusCode: 200;
          @bodyRoot
          @typeChangedFrom(Versions.v2, Http.File<"image/png">)
          body: Http.File<"image/png" | "image/jpeg">;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): WidgetResponse;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "ResponseContentTypeAdded")).toBeDefined();
    });

    it("detects enum member removed", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        enum Status {
          Active,
          @removed(Versions.v2) Deprecated,
          Suspended,
        }

        model Widget {
          name: string;
          status: Status;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "EnumerationMemberRemoved")).toBeDefined();
    });

    it("reports property diffs for each operation using the same model", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        model Widget {
          name: string;
          @added(Versions.v2) tags?: string[];
        }

        @route("/widgets")
        @get
        op listWidgets(): Widget[];

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      const responseAdded = diffs.filter(
        (d) =>
          d.kind === "ResponsePropertyAdded" &&
          "operation" in d.identity &&
          d.identity.element === "body.properties.tags",
      );

      expect(responseAdded).toHaveLength(2);
    });

    it("detects path parameter added as operation added", async () => {
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
        op listWidgets(@query filter?: string): Widget[];

        @added(Versions.v2)
        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "OperationAdded")).toBeDefined();
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
