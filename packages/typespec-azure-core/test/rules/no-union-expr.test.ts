import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noUnionExprRule } from "../../src/rules/no-union-expr.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, noUnionExprRule, "@azure-tools/typespec-azure-core");
});

it("emits diagnostic when using union expression", async () => {
  await tester
    .expect(
      `        
      model Request {
        approvalStatus: "Approved" | "Rejected" | string;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-union-expr",
    });
});

it("ok when using union declaration", async () => {
  await tester
    .expect(
      `        
        model Request {
          approvalStatus: RequestApprovalStatus;
        }

        union RequestApprovalStatus {
          Approved: "Approved",
          Rejected: "Rejected",
          string,
        }
      `,
    )
    .toBeValid();
});

it("ok when union is just | null", async () => {
  await tester
    .expect(
      `
      model Status { }
      model Request {
        approvalStatus: Status | null;
      }
      `,
    )
    .toBeValid();
});

it("ok for status code", async () => {
  await tester
    .expect(
      `
      op test(): {
        @statusCode _: 200 | 400 | 500;
      };
      `,
    )
    .toBeValid();
});

it("ok for content type", async () => {
  await tester
    .expect(
      `
      op test(): {
        @header contentType: "application/json" | "text/plain";
        @body _: string;
      };
      `,
    )
    .toBeValid();
});
