import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { beyondNestingRule } from "../../src/rules/beyond-nesting-levels.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    beyondNestingRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("is valid if there is only 3 level of nested resource", async () => {
  await tester
    .expect(
      `
        @Azure.ResourceManager.armProviderNamespace
              namespace MyService;

        model A is TrackedResource<{}> {
          @key("a") @segment("as") @path
          name: string;
        }

        @parentResource(A)
        model B is TrackedResource<{}> {
          @key("b") @segment("bs") @path
          name: string;
        }

        @parentResource(B)
        model C is TrackedResource<{}> {
          @key("c") @segment("cs") @path
          name: string;
        }
      `,
    )
    .toBeValid();
});

it("emit warnings if there is more than 3 nested resources", async () => {
  await tester
    .expect(
      `
        @Azure.ResourceManager.armProviderNamespace
              namespace MyService;

        model A is TrackedResource<{}> {
          @key("a") @segment("as") @path
          name: string;
        }

        @parentResource(A)
        model B is TrackedResource<{}> {
          @key("b") @segment("bs") @path
          name: string;
        }

        @parentResource(B)
        model C is TrackedResource<{}> {
          @key("c") @segment("cs") @path
          name: string;
        }

        // 4th nesting A > B > C > D
        @parentResource(C)
        model D is TrackedResource<{}> {
          @key("d") @segment("ds") @path
          name: string;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/beyond-nesting-levels",
      message: `Tracked Resources must use 3 or fewer levels of nesting.`,
    });
});
