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

it("emits warnings for generic numeric records, including nested records and arrays", async () => {
  await tester
    .expect(
      `
      model Widget {
        integers: Record<integer>;
        numbers: Record<numeric>;
        floats: Record<float>;
        decimals: Record<decimal>;
        nested: Record<Record<decimal>>;
        arrays: Record<decimal[]>;
        records: Record<decimal>[];
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
        ["decimal", "float32"],
        ["decimal", "float32"],
      ].map(([name, alternative]) => ({
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message: `Don't use generic type '${name}'. Use a more specific type that specifies the bit size, such as '${alternative}' instead.`,
      })),
    );
});

it("allows specific numeric arrays, records and inline query parameters", async () => {
  await tester
    .expect(
      `
      model Widget {
        smallNumbers: int8[];
        unsignedNumbers: uint32[];
        preciseNumbers: decimal128[][];
        smallRecords: Record<int8>;
        unsignedRecords: Record<uint32[]>;
        preciseRecords: Record<Record<decimal128>>;
      }

      op read(@query values: int32[], @query amount: float64): Widget;
      `,
    )
    .toBeValid();
});

it("handles recursive array and record models without reporting a generic numeric type", async () => {
  await tester
    .expect(
      `
      model RecursiveArray extends Array<RecursiveArray> {}
      model RecursiveRecord extends Record<RecursiveRecord> {}
      model RecursiveMixed extends Record<RecursiveMixed[]> {}
      model Widget {
        values: RecursiveArray;
        records: RecursiveRecord;
        mixed: RecursiveMixed;
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

it("checks copied model properties and spread operation return properties", async () => {
  await tester
    .expect(
      `
      model Values {
        amount: decimal;
      }
      model Copied {
        ...Values;
      }
      op read(): {
        ...Values;
      };
      `,
    )
    .toEmitDiagnostics(
      Array.from({ length: 3 }, () => ({
        code: "@azure-tools/typespec-azure-core/no-generic-numeric",
        message:
          "Don't use generic type 'decimal'. Use a more specific type that specifies the bit size, such as 'float32' instead.",
      })),
    );
});

it("does not duplicate warnings when operations reuse signatures", async () => {
  await tester
    .expect(
      `
      @route("/read")
      op read(amount: decimal): void;
      @route("/reuse")
      op reuse is read;
      @route("/reuse-again")
      op reuseAgain is reuse;
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
