import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noGenericTypesRule } from "../../src/rules/no-generic-types.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
  tester = createLinterRuleTester(runner, noGenericTypesRule, "@azure-tools/typespec-azure-core");
});

it("emits a warning diagnostic for generic types", async () => {
  await tester
    .expect(
      `
      namespace Azure.Widget;

      model Widget {
        prop1: integer;
        prop2: numeric;
        prop3: float;
        prop4: decimal;
      }
      `
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-generic-types",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-types",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-types",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-types",
      },
    ]);
});
