import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { validTcgcScopesRule } from "../../src/rules/valid-tcgc-scopes.js";
import { SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    validTcgcScopesRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("valid-tcgc-scopes", () => {
  it("accepts supported scopes and scope patterns", async () => {
    await tester
      .expect(
        `
        @service namespace TestService;

        @clientName("Csharp", "csharp") model Csharp {}
        @clientName("Go", "go") model Go {}
        @clientName("Java", "java") model Java {}
        @clientName("Javascript", "javascript") model Javascript {}
        @clientName("Python", "python") model Python {}
        @clientName("Multiple", "csharp, python") model Multiple {}
        @clientName("Negated", "!(java, go)") model Negated {}
        @clientName("Options", #{ scope: "javascript" }) model Options {}
        @clientName("Unscoped") model Unscoped {}
        `,
      )
      .toBeValid();
  });

  it("rejects unsupported scopes in TCGC decorators and options", async () => {
    await tester
      .expect(
        `
        using Azure.ClientGenerator.Core.Legacy;

        @alternateType(string, "typescript")
        scalar Timestamp extends utcDateTime;

        @clientName("Widget", #{ scope: "typescript" })
        model Widget {}

        @clientName("Gadget", "python, typescript")
        model Gadget {}

        @clientName("Negated", "!typescript")
        model Negated {}

        @scope("typescript")
        op list(): void;

        model Container {
          @Legacy.flattenProperty("typescript")
          nested: Nested;
        }
        model Nested {}
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
      ]);
  });

  it("checks scopes nested in client option models", async () => {
    await tester
      .expect(
        `
        @service namespace Service {}

        @client({ service: Service, scope: "typescript" })
        namespace Client {}

        model InitializationOptions extends ClientInitializationOptions {
          scope: "typescript";
        }
        @clientInitialization(InitializationOptions)
        namespace Initialization {}
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes",
          severity: "warning",
          message:
            'Unsupported TCGC language scope "typescript". Use one of: csharp, go, java, javascript, python.',
        },
      ]);
  });
});
