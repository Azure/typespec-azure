import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { orderByRule } from "../../src/rules/no-order-by.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: avoid orderBy parameter rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, orderByRule, "@azure-tools/typespec-azure-core");
  });

  describe("avoid use of orderBy parameter in Azure specs", () => {
    it("emit warning if Azure.Core.OrderByQueryParameter is used in ResourceList operation", async () => {
      await tester
        .expect(
          `
          model TestModel {
            @key
            @segment("test")
            name: string;
            value: int32;
          }

          alias MyTraits = Azure.Core.Traits.QueryParametersTrait<OrderByQueryParameter>;
    
          @test op list is Azure.Core.ResourceList<TestModel, MyTraits>;
        `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/no-order-by",
          severity: "warning",
          message: `List operations with an 'orderBy' parameter are uncommon; support should only be added after large collection sorting performance concerns are considered.`,
        });
    });

    it("emit warning if orderBy is used in ResourceList operation", async () => {
      await tester
        .expect(
          `
      model TestModel {
        @key
        @segment("test")
        name: string;
        value: int32;
      }
      
      alias MyTraits = Azure.Core.Traits.QueryParametersTrait<{@query orderBy: string}>;

      @test op list is Azure.Core.ResourceList<TestModel, MyTraits>;
      `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/no-order-by",
          severity: "warning",
          message: `List operations with an 'orderBy' parameter are uncommon; support should only be added after large collection sorting performance concerns are considered.`,
        });
    });

    it("do not emit warning if orderBy is used in non-standard operation", async () => {
      await tester.expect(`op list(@query orderBy: string): string[];`).toBeValid();
    });
  });
});
