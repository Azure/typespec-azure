import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { getOperationNameRule } from "../../src/rules/get-operation-name.rule.js";
import { ArmTester, SimpleTester } from "../tester.js";

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
          "GET SDK method name 'fetchWidget' should use 'Get' or 'List' as the verb prefix. Changing a method name after an SDK has shipped may be a breaking change.",
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

  it("uses the SDK method name instead of an explicit operation ID", async () => {
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
      .toBeValid();
  });

  it("reports an invalid SDK method name despite a compliant operation ID", async () => {
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
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-client-generator-core/get-operation-name",
        message:
          "GET SDK method name 'fetchDetails' should use 'Get' or 'List' as the verb prefix. Changing a method name after an SDK has shipped may be a breaking change.",
      });
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

  it("uses an unscoped client name override", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets")
        @get
        @clientName("listWidgets")
        op fetchWidgets(): string[];
      `,
      )
      .toBeValid();
  });

  it("ignores emitter-scoped client name overrides", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @route("/widgets")
        @get
        @clientName("getWidgets", "python")
        op fetchWidgets(): string[];
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-client-generator-core/get-operation-name",
        message:
          "GET SDK method name 'fetchWidgets' should use 'Get' or 'List' as the verb prefix. Changing a method name after an SDK has shipped may be a breaking change.",
      });
  });

  it("does not include the client location in the SDK method name", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        interface Source {
          @route("/widgets/{name}")
          @get
          getWidget(@path name: string): string;
        }

        @@clientLocation(Source.getWidget, "Widgets");
      `,
      )
      .toBeValid();
  });

  it("ignores operation types from the Azure.Core and Azure.ResourceManager libraries", async () => {
    const runner = await ArmTester.createInstance();
    const libraryTester = createLinterRuleTester(
      runner,
      getOperationNameRule,
      "@azure-tools/typespec-client-generator-core",
    );

    await libraryTester
      .expect(
        `
        alias CoreOperations = global.Azure.Core.ResourceOperations<
          global.Azure.Core.Traits.NoConditionalRequests &
            global.Azure.Core.Traits.NoRepeatableRequests &
            global.Azure.Core.Traits.NoClientRequestId
        >;
        alias ResourceManagerOperations = global.Azure.ResourceManager.Operations;
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
