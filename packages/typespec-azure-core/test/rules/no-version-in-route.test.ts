import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noVersionInRouteRule } from "../../src/rules/no-version-in-route.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, noVersionInRouteRule, "@azure-tools/typespec-azure-core");
});

describe("no-version-in-route", () => {
  it("emits diagnostic when the route starts with a version segment", async () => {
    await tester
      .expect(
        `
        @route("/v1/widgets")
        @get
        op listWidgets(): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-version-in-route",
          severity: "warning",
          message:
            'Operation path "/v1/widgets" contains the API version segment "v1". Express versioning with the "api-version" query parameter instead.',
        },
      ]);
  });

  it("emits diagnostic when the version segment is not the first segment", async () => {
    await tester
      .expect(
        `
        @route("/api/v2/widgets")
        @get
        op listWidgets(): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-version-in-route",
          severity: "warning",
          message:
            'Operation path "/api/v2/widgets" contains the API version segment "v2". Express versioning with the "api-version" query parameter instead.',
        },
      ]);
  });

  it("emits diagnostic when the version segment is the last segment", async () => {
    await tester
      .expect(
        `
        @route("/widgets/v2")
        @get
        op listWidgets(): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-version-in-route",
          severity: "warning",
        },
      ]);
  });

  it("emits diagnostic for a dotted version segment", async () => {
    await tester
      .expect(
        `
        @route("/v1.0/widgets")
        @get
        op listWidgets(): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-version-in-route",
          severity: "warning",
          message:
            'Operation path "/v1.0/widgets" contains the API version segment "v1.0". Express versioning with the "api-version" query parameter instead.',
        },
      ]);
  });

  it("emits diagnostic for an upper-case version segment", async () => {
    await tester
      .expect(
        `
        @route("/V3/widgets")
        @get
        op listWidgets(): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-version-in-route",
          severity: "warning",
        },
      ]);
  });

  it("emits diagnostic when the version segment comes from an interface route", async () => {
    await tester
      .expect(
        `
        @route("/v1")
        interface Widgets {
          @route("/widgets")
          @get
          list(): string;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-version-in-route",
          severity: "warning",
        },
      ]);
  });

  it("emits a single diagnostic when multiple version segments are present", async () => {
    await tester
      .expect(
        `
        @route("/v1/things/v2/widgets")
        @get
        op listWidgets(): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-version-in-route",
          severity: "warning",
          message:
            'Operation path "/v1/things/v2/widgets" contains the API version segment "v1". Express versioning with the "api-version" query parameter instead.',
        },
      ]);
  });

  it("is valid when the route has no version segment", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(@query("api-version") apiVersion: string): string;
        `,
      )
      .toBeValid();
  });

  it("is valid for segments that merely start with `v`", async () => {
    await tester
      .expect(
        `
        @route("/vms/volumes/v/verify2")
        @get
        op listWidgets(): string;
        `,
      )
      .toBeValid();
  });

  it("is valid when a path parameter is named like a version", async () => {
    await tester
      .expect(
        `
        @route("/{v1}/widgets")
        @get
        op listWidgets(@path v1: string): string;
        `,
      )
      .toBeValid();
  });

  it("does not apply to Azure.Core library operations", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2022_11_18: "2022-11-18",
        }

        @resource("widgets")
        model Widget {
          @key
          @visibility(Lifecycle.Read)
          name: string;
        }

        interface Widgets {
          get is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;
          list is Azure.Core.StandardResourceOperations.ResourceList<Widget>;
        }
        `,
      )
      .toBeValid();
  });
});
