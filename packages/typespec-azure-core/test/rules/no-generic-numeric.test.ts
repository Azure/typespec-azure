import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noGenericNumericRule } from "../../src/rules/no-generic-numeric.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
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

it("emits warnings for generic numeric array elements, including nested arrays", async () => {
  await tester
    .expect(
      `
      model Widget {
        integers: integer[];
        numbers: numeric[];
        floats: float[];
        decimals: decimal[];
        nested: decimal[][];
      }
      `,
    )
    .toEmitDiagnostics(
      [
        ["integer", "int32"],
        ["numeric", "int32"],
        ["float", "float32"],
        ["decimal", "float32"],
        ["decimal", "float32"],
      ].map(([name, alternative]) => ({
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message: `Don't use generic type '${name}'. Use a more specific type that specifies the bit size, such as '${alternative}' instead.`,
      })),
    );
});

it("emits warnings for generic numeric inline query parameters", async () => {
  await tester
    .expect(
      `
      op read(
        @query integerValue: integer,
        @query numericValue: numeric,
        @query floatValue: float,
        @query decimalValue: decimal
      ): void;
      `,
    )
    .toEmitDiagnostics(
      [
        ["integer", "int32"],
        ["numeric", "int32"],
        ["float", "float32"],
        ["decimal", "float32"],
      ].map(([name, alternative]) => ({
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message: `Don't use generic type '${name}'. Use a more specific type that specifies the bit size, such as '${alternative}' instead.`,
      })),
    );
});

it("allows specific numeric arrays and inline query parameters", async () => {
  await tester
    .expect(
      `
      model Widget {
        smallNumbers: int8[];
        unsignedNumbers: uint32[];
        preciseNumbers: decimal128[][];
      }

      op read(@query values: int32[], @query amount: float64): Widget;
      `,
    )
    .toBeValid();
});

it("handles recursive array models without reporting a generic numeric type", async () => {
  await tester
    .expect(
      `
      model RecursiveArray extends Array<RecursiveArray> {}
      model Widget {
        values: RecursiveArray;
      }
      `,
    )
    .toBeValid();
});

it("does not duplicate warnings when model properties are spread into operations", async () => {
  await tester
    .expect(
      `
      model Parameters {
        @query amount: decimal;
      }

      @route("/first")
      op first(...Parameters): void;
      @route("/second")
      op second(...Parameters): void;
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't use generic type 'decimal'. Use a more specific type that specifies the bit size, such as 'float32' instead.",
      },
    ]);
});
