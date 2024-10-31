import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noGenericNumericRule } from "../../src/rules/no-generic-numeric.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
  tester = createLinterRuleTester(runner, noGenericNumericRule, "@azure-tools/typespec-azure-core");
});

it("emits a warning for generic numeric types", async () => {
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
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't use generic type 'integer'. Use a more specific type that specifies the bit size, such as 'int32' instead.",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't use generic type 'numeric'. Use a more specific type that specifies the bit size, such as 'int32' instead.",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't use generic type 'float'. Use a more specific type that specifies the bit size, such as 'float32' instead.",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't use generic type 'decimal'. Use a more specific type that specifies the bit size, such as 'float32' instead.",
      },
    ]);
});

it("emits a warning when extending generic numeric types", async () => {
  await tester
    .expect(
      `
      namespace Azure.Widget;

      scalar GenericInteger extends integer;
      scalar GenericNumeric extends numeric;
      scalar GenericFloat extends float;
      scalar GenericDecimal extends decimal;
      
      model Widget {
        prop1: GenericInteger;
        prop2: GenericNumeric;
        prop3: GenericFloat;
        prop4: GenericDecimal;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't extend generic type 'integer'. Use a more specific type that specifies the bit size, such as 'int32' instead.",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't extend generic type 'numeric'. Use a more specific type that specifies the bit size, such as 'int32' instead.",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't extend generic type 'float'. Use a more specific type that specifies the bit size, such as 'float32' instead.",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't extend generic type 'decimal'. Use a more specific type that specifies the bit size, such as 'float32' instead.",
      },
    ]);
});
