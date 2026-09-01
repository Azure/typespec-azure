import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { getOperationNameRule } from "../../src/rules/get-operation-name.rule.js";
import { SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner: TesterInstance = await SimpleTester.import("@typespec/openapi").createInstance();
  tester = createLinterRuleTester(
    runner,
    getOperationNameRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("get-operation-name", () => {
  it("reports an invalid GET operation name", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets/{name}")
        @get
        op fetchWidget(@path name: string): string;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-client-generator-core/get-operation-name",
        message:
          "GET operation ID 'FetchWidget' should use 'Get' or 'List' as the verb prefix. Changing an operation ID after an SDK has shipped may be a breaking change.",
      });
  });

  it("accepts Get and List operation names", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets/{name}")
        @get
        op getWidget(@path name: string): string;

        @route("/widgets")
        @get
        op listWidgets(): string[];
      `,
      )
      .toBeValid();
  });

  it("reports a lowercase explicit List operation ID", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets")
        @get
        @OpenAPI.operationId("Widgets_listMigrations")
        op listMigrations(): string[];
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-client-generator-core/get-operation-name",
      });
  });

  it("accepts a compliant explicit operation ID", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets/{name}/details")
        @get
        @OpenAPI.operationId("Widgets_GetDetails")
        op fetchDetails(@path name: string): string;
      `,
      )
      .toBeValid();
  });

  it("reports concrete operations created from templates without reporting template artifacts", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @get
        op ResourceRead<T>(): T;

        @route("/widgets/details")
        op fetchWidget is ResourceRead<string>;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-client-generator-core/get-operation-name",
      });
  });

  it("accepts a concrete Get operation created from a template and ignores template artifacts", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @get
        op ResourceRead<T>(): T;

        @route("/widgets/details")
        op getWidget is ResourceRead<string>;
      `,
      )
      .toBeValid();
  });

  it("accepts the AutoRest operation ID resolved from client name and location", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        interface ScopeAccessReviewHistoryDefinitionInstances {
          @route("/accessReviewHistoryDefinitions")
          @get
          fetchByScope(): string[];
        }

        @@clientLocation(
          ScopeAccessReviewHistoryDefinitionInstances.fetchByScope,
          "ScopeAccessReviewHistoryDefinitions"
        );
        @@clientName(ScopeAccessReviewHistoryDefinitionInstances.fetchByScope, "List");
      `,
      )
      .toBeValid();
  });

  it("ignores an empty client location when resolving the AutoRest operation ID", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets/details")
        @get
        op getWidget(): string;

        @@clientLocation(getWidget, "");
      `,
      )
      .toBeValid();
  });

  it("ignores non-GET operations", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets")
        @post
        op createWidget(): string;
      `,
      )
      .toBeValid();
  });
});
