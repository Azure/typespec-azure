import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noDollarPrefixedQueryParamsRule } from "../../src/rules/no-dollar-prefixed-query-params.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noDollarPrefixedQueryParamsRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("no-dollar-prefixed-query-params", () => {
  it("emits diagnostic for a `$`-prefixed query parameter name", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(@query("$filter") filter?: string): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$filter" must not be prefixed with "$". Use "filter" instead.',
        },
      ]);
  });

  it("emits a diagnostic for each `$`-prefixed query parameter", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(
          @query("$top") top?: int32,
          @query("$skip") skip?: int32,
          @query("$orderby") orderby?: string,
        ): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$top" must not be prefixed with "$". Use "top" instead.',
        },
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$skip" must not be prefixed with "$". Use "skip" instead.',
        },
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message:
            'Query parameter "$orderby" must not be prefixed with "$". Use "orderby" instead.',
        },
      ]);
  });

  it("emits diagnostic for `$select`, `$expand` and `$maxpagesize`", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(
          @query("$select") select?: string[],
          @query("$expand") expand?: string[],
          @query("$maxpagesize") maxpagesize?: int32,
        ): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$select" must not be prefixed with "$". Use "select" instead.',
        },
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$expand" must not be prefixed with "$". Use "expand" instead.',
        },
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message:
            'Query parameter "$maxpagesize" must not be prefixed with "$". Use "maxpagesize" instead.',
        },
      ]);
  });

  it("emits diagnostic regardless of the casing of the parameter name", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(@query("$Filter") filter?: string): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$Filter" must not be prefixed with "$". Use "filter" instead.',
        },
      ]);
  });

  it("emits diagnostic when the parameter is spread in from a model", async () => {
    await tester
      .expect(
        `
        model ListOptions {
          @query("$filter")
          filter?: string;
        }

        @route("/widgets")
        @get
        op listWidgets(...ListOptions): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$filter" must not be prefixed with "$". Use "filter" instead.',
        },
      ]);
  });

  it("emits diagnostic when the parameter name itself is `$`-prefixed", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(@query \`$filter\`?: string): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-dollar-prefixed-query-params",
          severity: "warning",
          message: 'Query parameter "$filter" must not be prefixed with "$". Use "filter" instead.',
        },
      ]);
  });

  it("is valid when the standard query parameters are not prefixed", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(
          @query filter?: string,
          @query top?: int32,
          @query skip?: int32,
          @query orderby?: string,
          @query select?: string[],
          @query expand?: string[],
          @query maxpagesize?: int32,
        ): string;
        `,
      )
      .toBeValid();
  });

  it("is valid when a `$` appears somewhere other than the start of the name", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(@query("cost$filter") costFilter?: string): string;
        `,
      )
      .toBeValid();
  });

  it("is valid for a `$`-prefixed name that is not a standard query option", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(@query("$custom") custom?: string): string;
        `,
      )
      .toBeValid();
  });

  it("is valid when the `$`-prefixed name is a header, not a query parameter", async () => {
    await tester
      .expect(
        `
        @route("/widgets")
        @get
        op listWidgets(@header("$filter") filter?: string): string;
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
          list is Azure.Core.StandardResourceOperations.ResourceList<
            Widget,
            Azure.Core.Traits.QueryParametersTrait<Azure.Core.StandardListQueryParameters>
          >;
        }
        `,
      )
      .toBeValid();
  });
});
