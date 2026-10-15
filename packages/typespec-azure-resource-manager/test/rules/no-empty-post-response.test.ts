import { Tester } from "#test/tester.js";
import { getSourceLocation, type Operation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noEmptyPostResponseRule } from "../../src/rules/no-empty-post-response.js";

const header = `
  @armProviderNamespace
  namespace Microsoft.Contoso;
  model Employee is ProxyResource<{}> {
    ...ResourceNameParameter<Employee>;
  }
`;

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noEmptyPostResponseRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function action(response: string, verb = "post") {
  return `${header}
    @armResourceOperations
    interface Employees {
      @${verb} @armResourceAction(Employee)
      /*hire*/hire(...ApiVersionParameter): ${response} | ErrorResponse;
    }
  `;
}

function expected(operation: Operation) {
  const location = getSourceLocation(operation);
  return {
    code: "@azure-tools/typespec-azure-resource-manager/no-empty-post-response",
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
    await tester.expect(action(response)).toEmitDiagnostics(({ hire }) => expected(hire));
  });

  it.each([
    ["implicit model body", "{ @statusCode _: 200; result: boolean; }"],
    ["empty model payload", "{ @statusCode _: 200; @body result: {}; }"],
    ["no-content response", "{ @statusCode _: 204; }"],
  ])("accepts %s without duplicating other checks", async (_name, response) => {
    await tester.expect(action(response)).toBeValid();
  });

  it("accepts explicit scalar body without duplicating other checks", async () => {
    await tester.expect(action("{ @statusCode _: 200; @body result: string; }")).toBeValid();
  });

  it("accepts other success code without duplicating other checks", async () => {
    await tester.expect(action("{ @statusCode _: 201; result: string; }")).toBeValid();
  });

  it("does not apply the POST requirement to another verb", async () => {
    await tester.expect(action("{ @statusCode _: 200; }", "delete")).toBeValid();
  });

  it("checks the response customization of the synchronous ARM action template", async () => {
    await tester
      .expect(
        `${header}
        @armResourceOperations
        interface Employees {
          /*hire*/hire is ArmResourceActionSync<Employee, void, Response = { @statusCode _: 200; }>;
        }
      `,
      )
      .toEmitDiagnostics(({ hire }) => expected(hire));
  });

  it("accepts the documented 204 response customization", async () => {
    await tester
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
    await tester
      .expect(
        `${header}
        @armResourceOperations
        interface Employees {
          hire is ArmResourceActionAsync<Employee, void, Response = OkResponse>;
        }
      `,
      )
      .toBeValid();
  });

  it("rejects an explicit void body in the synchronous ARM action response", async () => {
    await tester
      .expect(
        `${header}
        @armResourceOperations
        interface Employees {
          /*hire*/hire is ArmResourceActionSync<Employee, void, Response = { @statusCode _: 200; @body result: void; }>;
        }
      `,
      )
      .toEmitDiagnostics(({ hire }) => expected(hire));
  });
});
