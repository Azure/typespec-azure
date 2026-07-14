import { describe, expect, it } from "vitest";
import { diffOperations } from "../src/diff-operations.js";
import { computeDiffs } from "../src/diff-engine.js";
import { compareTypes } from "../src/diff-types.js";
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

  describe("union type diffs", () => {
    it("detects named union variant added", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        union Status {
          Active: "active",
          Inactive: "inactive",
          @added(Versions.v2) Pending: "pending",
        }

        model Widget {
          status: Status;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "ResponsePropertyTypeWidened",
          "body.properties.status.variants.Pending",
        ),
      ).toBeDefined();
    });

    it("detects named union variant removed", async () => {
      const { baseView, headView } = await compileViews(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

        union Status {
          Active: "active",
          Inactive: "inactive",
          @removed(Versions.v2) Pending: "pending",
        }

        model Widget {
          status: Status;
        }

        @route("/widgets/{id}")
        @get
        op getWidget(@path id: string): Widget;
      `);

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "ResponsePropertyTypeNarrowed",
          "body.properties.status.variants.Pending",
        ),
      ).toBeDefined();
    });

    it("detects named union variant type changed", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          union Status {
            Active: int32,
            Inactive: string,
          }

          model Widget {
            status: Status;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          union Status {
            Active: boolean,
            Inactive: string,
          }

          model Widget {
            status: Status;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
      );

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "ResponsePropertyTypeChanged",
          "body.properties.status.variants.Active",
        ),
      ).toBeDefined();
    });

    it("detects anonymous union variant changes", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget {
            status: "active" | 1 | false;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget {
            status: "active" | "pending" | 1 | 2 | false | true;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
      );

      const diffs = computeDiffs(baseView, headView).diffs.filter(
        (diff) => diff.kind === "ResponsePropertyTypeWidened",
      );

      expect(
        diffs.some((diff) => "operation" in diff.identity && diff.identity.element.includes('"pending"')),
      ).toBe(true);
      expect(
        diffs.some((diff) => "operation" in diff.identity && diff.identity.element.endsWith(".2")),
      ).toBe(true);
      expect(
        diffs.some((diff) => "operation" in diff.identity && diff.identity.element.endsWith(".true")),
      ).toBe(true);
    });
  });

  describe("scalar type diffs", () => {
    it("detects response scalar type change", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget {
            count: int32;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget {
            count: string;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
      );

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "ResponsePropertyTypeChanged",
          "body.properties.count",
        ),
      ).toBeDefined();
    });

    it("detects request scalar type change", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            count: int32;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            count: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
      );

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestPropertyTypeChanged",
          "body.properties.count",
        ),
      ).toBeDefined();
    });
  });

  describe("request property diffs", () => {
    it("detects request property added", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name: string;
            age: int32;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
      );

      expect(
        findDiff(computeDiffs(baseView, headView).diffs, "RequestPropertyAdded", "body.properties.age"),
      ).toBeDefined();
    });

    it("detects request property removed", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name: string;
            legacy: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
      );

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestPropertyRemoved",
          "body.properties.legacy",
        ),
      ).toBeDefined();
    });

    it("detects request property made optional", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name?: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
      );

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestPropertyMadeOptional",
          "body.properties.name",
        ),
      ).toBeDefined();
    });

    it("detects request property made required", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name?: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model CreateWidgetRequest {
            name: string;
          }

          @route("/widgets")
          @post
          op createWidget(@body body: CreateWidgetRequest): void;
        `,
      );

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "RequestPropertyMadeRequired",
          "body.properties.name",
        ),
      ).toBeDefined();
    });
  });

  describe("type kind and root body diffs", () => {
    it("detects type kind change (model to scalar)", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model SubModel {
            x: int32;
          }

          model Widget {
            data: SubModel;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget {
            data: string;
          }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): Widget;
        `,
      );

      expect(
        findDiff(
          computeDiffs(baseView, headView).diffs,
          "ResponsePropertyTypeChanged",
          "body.properties.data",
        ),
      ).toBeDefined();
    });

    it("detects response root type kind changed", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          @route("/status")
          @get
          op getStatus(): "active" | "inactive";
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          @route("/status")
          @get
          op getStatus(): string;
        `,
      );

      expect(findDiff(computeDiffs(baseView, headView).diffs, "ResponseTypeKindChanged", "body")).toBeDefined();
    });

    it("detects response root type widened", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          @route("/status")
          @get
          op getStatus(): "active" | "inactive";
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          @route("/status")
          @get
          op getStatus(): "active" | "inactive" | "pending";
        `,
      );

      expect(findDiff(computeDiffs(baseView, headView).diffs, "ResponseTypeWidened")).toBeDefined();
    });

    it("detects request root type narrowed", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          @route("/status")
          @post
          op setStatus(@body body: "active" | "inactive" | "pending"): void;
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          @route("/status")
          @post
          op setStatus(@body body: "active" | "inactive"): void;
        `,
      );

      expect(findDiff(computeDiffs(baseView, headView).diffs, "RequestTypeNarrowed")).toBeDefined();
    });
  });

  describe("internal type helper coverage", () => {
    it("handles union variants when compared directly", async () => {
      const baseProgram = await compileProgram(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01" }

        union Status {
          Active: "active",
        }
      `);

      const headProgram = await compileProgram(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01" }

        union Status {
          Active: "active",
        }
      `);

      const baseNamespace = baseProgram.getGlobalNamespaceType().namespaces.get("TestService")!;
      const headNamespace = headProgram.getGlobalNamespaceType().namespaces.get("TestService")!;
      const baseVariant = baseNamespace.unions.get("Status")!.variants.get("Active")!;
      const headVariant = headNamespace.unions.get("Status")!.variants.get("Active")!;

      expect(
        compareTypes(baseVariant, headVariant, {
          operation: { method: "GET", path: "/status" },
          component: "response",
          elementPath: "body",
          visited: new Set(),
        }),
      ).toEqual([]);
    });

    it("describes named and intrinsic anonymous union variants", async () => {
      const baseProgram = await compileProgram(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01" }

        model ResultContainer {
          value: string | int32;
        }
      `);

      const headProgram = await compileProgram(`
        using TypeSpec.Http;
        using TypeSpec.Versioning;

        @versioned(Versions)
        @service
        namespace TestService;

        enum Versions { v1: "2024-01-01" }

        model Payload {
          name: string;
        }

        union NamedStatus {
          ok: boolean,
        }

        model ResultContainer {
          value: string | int32 | Payload | NamedStatus | null;
        }
      `);

      const baseNamespace = baseProgram.getGlobalNamespaceType().namespaces.get("TestService")!;
      const headNamespace = headProgram.getGlobalNamespaceType().namespaces.get("TestService")!;
      const baseType = baseNamespace.models.get("ResultContainer")!.properties.get("value")!.type;
      const headType = headNamespace.models.get("ResultContainer")!.properties.get("value")!.type;
      const widened = compareTypes(baseType, headType, {
        operation: { method: "GET", path: "/result" },
        component: "response",
        elementPath: "body",
        visited: new Set(),
      }).filter((diff) => diff.kind === "ResponseTypeWidened");

      expect(widened.length).toBeGreaterThan(0);
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
    it("detects response header removed in two-spec comparison", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget { name: string; }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): {
            @statusCode statusCode: 200;
            @header("x-request-id") requestId: string;
            @body body: Widget;
          };
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget { name: string; }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): {
            @statusCode statusCode: 200;
            @body body: Widget;
          };
        `,
      );

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "ResponseHeaderRemoved", "headers.x-request-id")).toBeDefined();
    });

    it("detects response header added in two-spec comparison", async () => {
      const { baseView, headView } = await compileTwoSpecs(
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget { name: string; }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): {
            @statusCode statusCode: 200;
            @body body: Widget;
          };
        `,
        `
          using TypeSpec.Http;
          using TypeSpec.Versioning;

          @versioned(Versions)
          @service
          namespace TestService;

          enum Versions { v1: "2024-01-01" }

          model Widget { name: string; }

          @route("/widgets/{id}")
          @get
          op getWidget(@path id: string): {
            @statusCode statusCode: 200;
            @header("x-request-id") requestId: string;
            @body body: Widget;
          };
        `,
      );

      const { diffs } = computeDiffs(baseView, headView);
      expect(findDiff(diffs, "ResponseHeaderAdded", "headers.x-request-id")).toBeDefined();
    });

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

    it("detects request content type removed for multipart bodies", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model UploadBody {
          name: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const uploadBody = namespace.models.get("UploadBody")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {
            body: {
              bodyKind: "multipart",
              contentTypes: ["multipart/form-data"],
              type: { wireType: uploadBody },
            },
          },
          responses: [],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        { method: "POST", path: "/upload" },
      );

      expect(findDiff(diffs, "RequestContentTypeRemoved", "body")).toEqual(
        expect.objectContaining({
          details: expect.objectContaining({ contentType: "multipart/form-data" }),
        }),
      );
    });

    it("detects request content type added for multipart bodies", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model UploadBody {
          name: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const uploadBody = namespace.models.get("UploadBody")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {
            body: {
              bodyKind: "multipart",
              contentTypes: ["multipart/form-data"],
              type: { wireType: uploadBody },
            },
          },
          responses: [],
        } as any,
        { method: "POST", path: "/upload" },
      );

      expect(findDiff(diffs, "RequestContentTypeAdded", "body")).toEqual(
        expect.objectContaining({
          details: expect.objectContaining({ contentType: "multipart/form-data" }),
        }),
      );
    });

    it("detects response content type added for file responses", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model FilePayload {
          content: bytes;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const bytesType = namespace.models.get("FilePayload")!.properties.get("content")!.type;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: 200,
              responses: [
                {
                  body: {
                    bodyKind: "file",
                    contentTypes: ["image/png"],
                    type: { wireType: bytesType },
                  },
                },
              ],
            },
          ],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: 200,
              responses: [
                {
                  body: {
                    bodyKind: "file",
                    contentTypes: ["image/png", "image/jpeg"],
                    type: { wireType: bytesType },
                  },
                },
              ],
            },
          ],
        } as any,
        { method: "GET", path: "/files/{}" },
      );

      expect(findDiff(diffs, "ResponseContentTypeAdded", "body")).toEqual(
        expect.objectContaining({
          details: expect.objectContaining({ contentType: "image/jpeg" }),
        }),
      );
    });

    it("detects response content type removed when content types no longer overlap", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model FilePayload {
          content: bytes;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const bytesType = namespace.models.get("FilePayload")!.properties.get("content")!.type;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: 200,
              responses: [
                {
                  body: {
                    bodyKind: "file",
                    contentTypes: ["image/png"],
                    type: { wireType: bytesType },
                  },
                },
              ],
            },
          ],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: 200,
              responses: [
                {
                  body: {
                    bodyKind: "file",
                    contentTypes: ["image/jpeg"],
                    type: { wireType: bytesType },
                  },
                },
              ],
            },
          ],
        } as any,
        { method: "GET", path: "/files/{}" },
      );

      expect(findDiff(diffs, "ResponseContentTypeRemoved", "body")).toEqual(
        expect.objectContaining({
          details: expect.objectContaining({ contentType: "image/png" }),
        }),
      );
      expect(findDiff(diffs, "ResponseContentTypeAdded", "body")).toEqual(
        expect.objectContaining({
          details: expect.objectContaining({ contentType: "image/jpeg" }),
        }),
      );
    });

    it("compares parameter model properties against raw types", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model QueryParameters {
          filter: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const filter = namespace.models.get("QueryParameters")!.properties.get("filter")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [
            {
              options: { name: "filter" },
              property: { wireType: filter, sourceType: filter },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        {
          pathParameters: [],
          queryParameters: [
            {
              options: { name: "filter" },
              property: { wireType: filter.type, sourceType: filter },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        { method: "GET", path: "/widgets" },
      );

      expect(diffs).toEqual([]);
    });

    it("detects request parameters made optional", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model QueryShapes {
          requiredFilter: string;
          optionalFilter?: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const queryShapes = namespace.models.get("QueryShapes")!;
      const requiredFilter = queryShapes.properties.get("requiredFilter")!;
      const optionalFilter = queryShapes.properties.get("optionalFilter")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [
            {
              options: { name: "filter" },
              property: { wireType: requiredFilter, sourceType: requiredFilter },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        {
          pathParameters: [],
          queryParameters: [
            {
              options: { name: "filter" },
              property: { wireType: optionalFilter, sourceType: optionalFilter },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        { method: "GET", path: "/widgets" },
      );

      expect(findDiff(diffs, "RequestParameterMadeOptional", "query.filter")).toBeDefined();
    });

    it("detects request parameters made required", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model QueryShapes {
          requiredFilter: string;
          optionalFilter?: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const queryShapes = namespace.models.get("QueryShapes")!;
      const requiredFilter = queryShapes.properties.get("requiredFilter")!;
      const optionalFilter = queryShapes.properties.get("optionalFilter")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [
            {
              options: { name: "filter" },
              property: { wireType: optionalFilter, sourceType: optionalFilter },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        {
          pathParameters: [],
          queryParameters: [
            {
              options: { name: "filter" },
              property: { wireType: requiredFilter, sourceType: requiredFilter },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        { method: "GET", path: "/widgets" },
      );

      expect(findDiff(diffs, "RequestParameterMadeRequired", "query.filter")).toBeDefined();
    });

    it("skips parameter type comparison when a comparable type is missing", async () => {
      let baseAccessCount = 0;
      const baseParam = {
        options: { name: "filter" },
        property: {
          get wireType() {
            baseAccessCount++;
            return baseAccessCount <= 2
              ? ({ kind: "ModelProperty", optional: false } as any)
              : undefined;
          },
          sourceType: { name: "filter" },
        },
      };

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [baseParam],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        {
          pathParameters: [],
          queryParameters: [
            {
              options: { name: "filter" },
              property: {
                wireType: { kind: "ModelProperty", optional: false, type: undefined },
                sourceType: { name: "filter" },
              },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        { method: "GET", path: "/widgets" },
      );

      expect(diffs).toEqual([]);
    });

    it("uses ranged status code keys when diffing responses", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model Headers {
          requestId: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const requestId = namespace.models.get("Headers")!.properties.get("requestId")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: { start: 200, end: 299 },
              responses: [{}],
            },
          ],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: { start: 200, end: 299 },
              responses: [
                {
                  headers: {
                    "x-request-id": { wireType: requestId, sourceType: requestId },
                  },
                },
              ],
            },
          ],
        } as any,
        { method: "GET", path: "/widgets/{}" },
      );

      expect(findDiff(diffs, "ResponseHeaderAdded", "headers.x-request-id")).toEqual(
        expect.objectContaining({
          identity: expect.objectContaining({ statusCode: "200-299" }),
        }),
      );
    });

    it("uses wildcard status code keys when diffing responses", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model Headers {
          requestId: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const requestId = namespace.models.get("Headers")!.properties.get("requestId")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: "*",
              responses: [{}],
            },
          ],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: "*",
              responses: [
                {
                  headers: {
                    "x-request-id": { wireType: requestId, sourceType: requestId },
                  },
                },
              ],
            },
          ],
        } as any,
        { method: "GET", path: "/widgets/{}" },
      );

      expect(findDiff(diffs, "ResponseHeaderAdded", "headers.x-request-id")).toEqual(
        expect.objectContaining({
          identity: expect.objectContaining({ statusCode: "*" }),
        }),
      );
    });

    it("detects response status code removed", async () => {
      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [{ statusCodes: 404, responses: [{}] }],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        { method: "GET", path: "/widgets/{}" },
      );

      expect(findDiff(diffs, "ResponseStatusCodeRemoved", "body")).toEqual(
        expect.objectContaining({
          details: expect.objectContaining({ statusCode: "404" }),
        }),
      );
    });

    it("continues cleanly when response status codes do not overlap", async () => {
      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [{ statusCodes: 200, responses: [{}] }],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [{ statusCodes: 201, responses: [{}] }],
        } as any,
        { method: "GET", path: "/widgets/{}" },
      );

      expect(findDiff(diffs, "ResponseStatusCodeRemoved", "body")).toBeDefined();
      expect(findDiff(diffs, "ResponseStatusCodeAdded", "body")).toBeDefined();
    });

    it("does not report response header diffs when the header exists in both responses", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model Headers {
          requestId: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const requestId = namespace.models.get("Headers")!.properties.get("requestId")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: 200,
              responses: [
                {
                  headers: {
                    "x-request-id": { wireType: requestId, sourceType: requestId },
                  },
                },
              ],
            },
          ],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [
            {
              statusCodes: 200,
              responses: [
                {
                  headers: {
                    "x-request-id": { wireType: requestId, sourceType: requestId },
                  },
                },
              ],
            },
          ],
        } as any,
        { method: "GET", path: "/widgets/{}" },
      );

      expect(findDiff(diffs, "ResponseHeaderAdded", "headers.x-request-id")).toBeUndefined();
      expect(findDiff(diffs, "ResponseHeaderRemoved", "headers.x-request-id")).toBeUndefined();
    });

    it("uses source-type names and ignores unnamed parameters", async () => {
      const program = await compileProgram(`
        namespace TestService;

        model QueryShapes {
          filter: string;
        }
      `);

      const namespace = program.getGlobalNamespaceType().namespaces.get("TestService")!;
      const filter = namespace.models.get("QueryShapes")!.properties.get("filter")!;

      const diffs = diffOperations(
        {
          pathParameters: [],
          queryParameters: [
            {
              property: { wireType: filter, sourceType: filter },
            },
            {
              property: { wireType: filter, sourceType: {} },
            },
          ],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        {
          pathParameters: [],
          queryParameters: [],
          requestHeaders: [],
          requestParameters: {},
          responses: [],
        } as any,
        { method: "GET", path: "/widgets" },
      );

      expect(findDiff(diffs, "RequestQueryParameterRemoved", "query.filter")).toBeDefined();
      expect(diffs).toHaveLength(1);
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

      expect(responseAdded).toHaveLength(1);
      // Deduplication collapses identical diffs from shared model across operations
      expect(responseAdded[0].details?.affectedOperations).toBeDefined();
      expect((responseAdded[0].details?.affectedOperations as any[]).length).toBe(2);
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

async function compileProgram(spec: string) {
  const normalizedSpec = spec.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");
  const { program } = await Tester.compile(normalizedSpec);
  return program;
}

async function compileTwoSpecs(
  baseSpec: string,
  headSpec: string,
  version = "2024-01-01",
): Promise<{ baseView: VersionedView; headView: VersionedView }> {
  const strip = (s: string) => s.replace(/^\s*using TypeSpec\.(Http|Versioning);\s*$/gm, "");
  const { program: baseProgram } = await Tester.compile(strip(baseSpec));
  const { program: headProgram } = await Tester.compile(strip(headSpec));
  const [baseService] = enumerateVersions(baseProgram);
  const [headService] = enumerateVersions(headProgram);

  expect(baseService).toBeDefined();
  expect(headService).toBeDefined();

  return {
    baseView: createVersionedView(baseProgram, baseService.service, version),
    headView: createVersionedView(headProgram, headService.service, version),
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
