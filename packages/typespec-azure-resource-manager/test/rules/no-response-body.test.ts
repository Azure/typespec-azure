import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noResponseBodyRule } from "../../src/rules/no-response-body.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: no response body rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      noResponseBodyRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });

  it("is valid if 202 responses have no body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 202;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toBeValid();
  });

  it("is valid if 204 responses have no body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 204;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toBeValid();
  });

  it("emit warnings if a 204 response has a body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 204;
          @bodyRoot body: string;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: `The body of 204 response should be empty.`,
      });
  });

  it("emit warnings if a 202 response has a body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 202;
          @bodyRoot body: string;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: `The body of 202 response should be empty.`,
      });
  });

  it("emit warnings if 201 responses have no body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 201;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: `The body of non-204/non-202 responses should not be empty.`,
      });
  });
});
