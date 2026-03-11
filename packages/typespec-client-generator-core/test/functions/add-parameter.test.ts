import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
} from "../tester.js";

describe("addParameter", () => {
  describe("basic usage", () => {
    it("adds a new parameter to an operation and verifies mappings", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query existingParam: string): void;
          `,
          `
          model ExtraParams {
            newParam: int32;
          }

          #suppress "experimental-feature" "testing addParameter"
          @@override(MyService.myOp, addParameter(MyService.myOp, ExtraParams.newParam));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];

      strictEqual(method.kind, "basic");
      strictEqual(method.name, "myOp");

      // Verify original parameter still exists
      const existingParam = method.parameters.find((x) => x.name === "existingParam");
      ok(existingParam, "existingParam should exist");

      // Verify new parameter was added to method params
      const newParam = method.parameters.find((x) => x.name === "newParam");
      ok(newParam, "newParam parameter should exist");
      strictEqual(newParam.type.kind, "int32");

      // Verify operation parameter maps to method parameter for original param
      const opExistingParam = method.operation.parameters.find((x) => x.name === "existingParam");
      ok(opExistingParam, "existingParam should exist in operation params");
      strictEqual(opExistingParam.correspondingMethodParams.length, 1);
      strictEqual(opExistingParam.correspondingMethodParams[0], existingParam);
    });
  });

  describe("chaining with replaceParameter", () => {
    it("chains replaceParameter and addParameter", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query oldParam?: string): void;
          `,
          `
          model NewParams {
            oldParam: string;
            newParam: int32;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          alias step1 = replaceParameter(MyService.myOp, "oldParam", NewParams.oldParam);
          #suppress "experimental-feature" "testing addParameter"
          @@override(MyService.myOp, addParameter(step1, NewParams.newParam));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      // Verify oldParam was made required
      const oldParam = method.parameters.find((x) => x.name === "oldParam");
      ok(oldParam, "oldParam should exist");
      strictEqual(oldParam.optional, false, "oldParam should now be required");

      // Verify newParam was added
      const newParam = method.parameters.find((x) => x.name === "newParam");
      ok(newParam, "newParam should exist");
      strictEqual(newParam.type.kind, "int32");
    });
  });

  describe("scoped usage", () => {
    it("applies override only for specified language scope", async () => {
      const mainCode = `
        @service
        namespace MyService;

        op myOp(@query param: string): void;
        `;

      const customizationCode = `
        model ExtraParams {
          pythonOnlyParam: string;
        }

        #suppress "experimental-feature" "testing addParameter"
        @@override(MyService.myOp, addParameter(MyService.myOp, ExtraParams.pythonOnlyParam), "python");
        `;

      // Test with Python scope - should have the added parameter
      const { program: pythonProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const pythonContext = await createSdkContextForTester(pythonProgram, {
        emitterName: "@azure-tools/typespec-python",
      });
      const pythonMethod = pythonContext.sdkPackage.clients[0].methods[0];
      const pythonOnlyParam = pythonMethod.parameters.find((x) => x.name === "pythonOnlyParam");
      ok(pythonOnlyParam, "pythonOnlyParam should exist for Python");

      // Test with C# scope - should NOT have the added parameter
      const { program: csharpProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const csharpContext = await createSdkContextForTester(csharpProgram, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      const csharpMethod = csharpContext.sdkPackage.clients[0].methods[0];
      const csharpPythonOnlyParam = csharpMethod.parameters.find(
        (x) => x.name === "pythonOnlyParam",
      );
      strictEqual(csharpPythonOnlyParam, undefined, "pythonOnlyParam should not exist for C#");
    });
  });

  describe("complex scenarios", () => {
    it("adds multiple parameters via chaining", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query param: string): void;
          `,
          `
          model ExtraParams {
            param1: int32;
            param2: boolean;
          }

          #suppress "experimental-feature" "testing addParameter"
          alias step1 = addParameter(MyService.myOp, ExtraParams.param1);
          #suppress "experimental-feature" "testing addParameter"
          @@override(MyService.myOp, addParameter(step1, ExtraParams.param2));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      // Verify original param exists
      const param = method.parameters.find((x) => x.name === "param");
      ok(param, "param should exist");

      // Verify param1 was added
      const param1 = method.parameters.find((x) => x.name === "param1");
      ok(param1, "param1 should exist");
      strictEqual(param1.type.kind, "int32");

      // Verify param2 was added
      const param2 = method.parameters.find((x) => x.name === "param2");
      ok(param2, "param2 should exist");
      strictEqual(param2.type.kind, "boolean");
    });

    it("preserves parameter order with original params first", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query first: string, @query second: int32): void;
          `,
          `
          model ExtraParams {
            third: boolean;
          }

          #suppress "experimental-feature" "testing addParameter"
          @@override(MyService.myOp, addParameter(MyService.myOp, ExtraParams.third));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      const paramNames = method.parameters.map((p) => p.name);
      ok(paramNames.includes("first"), "first param should exist");
      ok(paramNames.includes("second"), "second param should exist");
      ok(paramNames.includes("third"), "third param should exist");

      // Verify third comes after first and second
      const firstIndex = paramNames.indexOf("first");
      const secondIndex = paramNames.indexOf("second");
      const thirdIndex = paramNames.indexOf("third");
      ok(thirdIndex > firstIndex, "third should come after first");
      ok(thirdIndex > secondIndex, "third should come after second");
    });
  });
});
