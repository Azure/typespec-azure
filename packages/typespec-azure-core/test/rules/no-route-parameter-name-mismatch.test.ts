import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noRouteParameterNameMismatchRule } from "../../src/rules/no-route-parameter-name-mismatch.js";

describe("typespec-azure-core: no-route-parameter-name-mismatch", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    const runner = await Tester.createInstance();
    tester = createLinterRuleTester(
      runner,
      noRouteParameterNameMismatchRule,
      "@azure-tools/typespec-azure-core",
    );
  });

  it("emit a warning if two operations have the same path but different parameter names", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}")
        op getWidget(@path subscriptionId: string, @path widgetName: string): void;

        @route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{name}")
        op updateWidget(@path subscriptionId: string, @path name: string): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch",
          severity: "warning",
          message: `Path "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{name}" has inconsistent parameter name "name" which should be "widgetName" to match existing operation with path "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}"`,
        },
      ]);
  });

  it("emit warnings for multiple mismatched parameters", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/providers/Microsoft.Contoso/foos/{fooName}/bars/{barName}")
        op getBar(@path fooName: string, @path barName: string): void;

        @route("/providers/Microsoft.Contoso/foos/{name}/bars/{barName}")
        op updateBar(@path name: string, @path barName: string): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch",
          severity: "warning",
          message: `Path "/providers/Microsoft.Contoso/foos/{name}/bars/{barName}" has inconsistent parameter name "name" which should be "fooName" to match existing operation with path "/providers/Microsoft.Contoso/foos/{fooName}/bars/{barName}"`,
        },
      ]);
  });

  it("does not emit a warning when parameter names are consistent", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/providers/Microsoft.Contoso/foos/{fooName}/bars/{barName}")
        op getBar(@path fooName: string, @path barName: string): void;

        @put
        @route("/providers/Microsoft.Contoso/foos/{fooName}/bars/{barName}")
        op updateBar(@path fooName: string, @path barName: string): void;
        `,
      )
      .toBeValid();
  });

  it("does not emit a warning for different paths", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/providers/Microsoft.Contoso/foos/{fooName}")
        op getFoo(@path fooName: string): void;

        @route("/providers/Microsoft.Contoso/bars/{barName}")
        op getBar(@path barName: string): void;
        `,
      )
      .toBeValid();
  });

  it("emit a warning when operations with allowReserved path parameters have non-reserved params mismatched", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/{+scope}/providers/Microsoft.Contoso/foos/{fooName}")
        op getFoo(@path scope: string, @path fooName: string): void;

        @route("/{+resourceUri}/providers/Microsoft.Contoso/foos/{name}")
        op updateFoo(@path resourceUri: string, @path name: string): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch",
          severity: "warning",
          message: `Path "/{resourceUri}/providers/Microsoft.Contoso/foos/{name}" has inconsistent parameter name "name" which should be "fooName" to match existing operation with path "/{scope}/providers/Microsoft.Contoso/foos/{fooName}"`,
        },
      ]);
  });

  it("does not emit a warning when both allowReserved path parameters have different names", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/{+resourceUri}/providers/Microsoft.Contoso/foos/{fooName}")
        op getFoo(@path resourceUri: string, @path fooName: string): void;

        @put
        @route("/{+scope}/providers/Microsoft.Contoso/foos/{fooName}")
        op updateFoo(@path scope: string, @path fooName: string): void;
        `,
      )
      .toBeValid();
  });

  it("emit a warning when allowReserved differs between matching path parameters", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/{+scope}/providers/Microsoft.Contoso/foos/{fooName}")
        op getFoo(@path scope: string, @path fooName: string): void;

        @put
        @route("/{scope}/providers/Microsoft.Contoso/foos/{fooName}")
        op updateFoo(@path scope: string, @path fooName: string): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch",
          severity: "warning",
          message: `Path "/{scope}/providers/Microsoft.Contoso/foos/{fooName}" has parameter "scope" which should have allowReserved=true to match existing operation with path "/{scope}/providers/Microsoft.Contoso/foos/{fooName}"`,
        },
      ]);
  });

  it("does not emit a warning when allowReserved operations have consistent names", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/{+scope}/providers/Microsoft.Contoso/foos/{fooName}")
        op getFoo(@path scope: string, @path fooName: string): void;

        @put
        @route("/{+scope}/providers/Microsoft.Contoso/foos/{fooName}")
        op updateFoo(@path scope: string, @path fooName: string): void;
        `,
      )
      .toBeValid();
  });

  it("emit warnings when third operation also mismatches", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}")
        op getWidget(@path subscriptionId: string, @path widgetName: string): void;

        @route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{name}")
        op updateWidget(@path subscriptionId: string, @path name: string): void;

        @route("/subscriptions/{subscription}/providers/Microsoft.Foo/widgets/{widgetName}")
        op deleteWidget(@path subscription: string, @path widgetName: string): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch",
          severity: "warning",
          message: `Path "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{name}" has inconsistent parameter name "name" which should be "widgetName" to match existing operation with path "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}"`,
        },
        {
          code: "@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch",
          severity: "warning",
          message: `Path "/subscriptions/{subscription}/providers/Microsoft.Foo/widgets/{widgetName}" has inconsistent parameter name "subscription" which should be "subscriptionId" to match existing operation with path "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}"`,
        },
      ]);
  });
});
