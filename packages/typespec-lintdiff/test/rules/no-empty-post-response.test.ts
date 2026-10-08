import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { getArmResources } from "@azure-tools/typespec-azure-resource-manager";
import { getSourceLocation, resolvePath, type Program } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { noEmptyPostResponseRule } from "../../src/rules/no-empty-post-response.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

const header = `
  using TypeSpec.Http;
  using Azure.ResourceManager;
  @armProviderNamespace
  namespace Microsoft.Contoso;
  model Employee is ProxyResource<{}> {
    ...ResourceNameParameter<Employee>;
  }
`;

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    noEmptyPostResponseRule,
    "tsp-lintdiff-local-linter",
  );
}

function action(response: string, verb = "post") {
  return `${header}
    @armResourceOperations
    interface Employees {
      @${verb} @armResourceAction(Employee)
      hire(...ApiVersionParameter): ${response} | ErrorResponse;
    }
  `;
}

function expected(program: Program) {
  const operation = program
    .getGlobalNamespaceType()
    .namespaces.get("Microsoft")!
    .namespaces.get("Contoso")!
    .interfaces.get("Employees")!
    .operations.get("hire")!;
  const location = getSourceLocation(operation);
  return {
    code: "tsp-lintdiff-local-linter/no-empty-post-response",
    message: noEmptyPostResponseRule.messages.default,
    severity: "warning" as const,
    pos: location.pos,
    end: location.end,
  };
}

describe("no-empty-post-response", () => {
  it.each([
    ["metadata-only response", "{ @statusCode _: 200; }"],
    ["headers are not a body", "{ @statusCode _: 200; @header etag: string; }"],
    [
      "one empty response variant",
      "{ @statusCode _: 200; result: string; } | { @statusCode _: 200; @header etag: string; }",
    ],
  ])("rejects a synchronous 200 %s", async (_name, response) => {
    const rule = await tester();
    await rule.expect(action(response)).toEmitDiagnostics(({ program }) => expected(program));
  });

  it.each([
    ["implicit model body", "{ @statusCode _: 200; result: boolean; }"],
    ["explicit scalar body", "{ @statusCode _: 200; @body result: string; }"],
    ["empty model payload", "{ @statusCode _: 200; @body result: {}; }"],
    ["no-content response", "{ @statusCode _: 204; }"],
    ["other success code", "{ @statusCode _: 201; result: string; }"],
  ])("accepts %s without duplicating other checks", async (_name, response) => {
    const rule = await tester();
    await rule.expect(action(response)).toBeValid();
  });

  it("does not apply the POST requirement to another verb", async () => {
    const rule = await tester();
    await rule.expect(action("{ @statusCode _: 200; }", "delete")).toBeValid();
  });

  it("checks the response customization of the synchronous ARM action template", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
        @armResourceOperations
        interface Employees {
          hire is ArmResourceActionSync<Employee, void, Response = { @statusCode _: 200; }>;
        }
      `,
      )
      .toEmitDiagnostics(({ program }) => expected(program));
  });

  it("accepts the documented 204 response customization", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
        @armResourceOperations
        interface Employees {
          hire is ArmResourceActionSync<Employee, void, Response = ArmNoContentResponse>;
        }
      `,
      )
      .toBeValid();
  });

  it("excludes a long-running POST with an otherwise offending bodyless 200 response", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
        @armResourceOperations
        interface Employees {
          hire is ArmResourceActionAsync<Employee, void, Response = OkResponse>;
        }
      `,
      )
      .toEmitDiagnostics(({ program }) => {
        const operation = getArmResources(program)[0].operations.actions.hire;
        expect(getLroMetadata(program, operation.operation)).toBeDefined();
        expect(
          operation.httpOperation.responses.some(
            (response) =>
              response.statusCodes === 200 &&
              response.responses.some((variant) => variant.body === undefined),
          ),
        ).toBe(true);
        return [];
      });
  });
});
