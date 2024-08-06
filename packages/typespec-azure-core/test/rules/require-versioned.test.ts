import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireVersionedRule } from "../../src/rules/require-versioned.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
  tester = createLinterRuleTester(runner, requireVersionedRule, "@azure-tools/typespec-azure-core");
});

it("emits a warning if service is missing @versioned", async () => {
  await tester
    .expect(
      `        
        @service
        namespace Azure.MyService;
        `
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/require-versioned",
      },
    ]);
});

it("emits a warning if one service is missing @versioned even if another has it", async () => {
  await tester
    .expect(
      `        
        @service
        namespace Azure.MyService1 {}

        @service
        @versioned(Versions)
        namespace Azure.MyService2 {
          enum Versions {
            v1, v2
            }
        }
        `
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/require-versioned",
      },
    ]);
});

it("ok if service has the @versioned decorator", async () => {
  await tester
    .expect(
      `       
        @service
        @versioned(Versions)
        namespace Azure.MyService; 
        enum Versions {
          v1, v2
        }
        `
    )
    .toBeValid();
});

describe("codefix", () => {
  it("apply decorator", async () => {
    await tester
      .expect(
        `        
        @service
        namespace Azure.MyService;
        `
      )
      .applyCodeFix("add-versioned").toEqual(`
        @versioned(Versions /* create an enum called Versions with your service version */)
        @service
        namespace Azure.MyService;
      `);
  });
});
