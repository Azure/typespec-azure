import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
} from "../tester.js";

describe("reorderParameters", () => {
  describe("basic usage", () => {
    it("reorders parameters according to specified order", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query a: string, @query b: int32, @query c: boolean): void;
          `,
          `
          #suppress "experimental-feature" "testing reorderParameters"
          @@override(MyService.myOp, reorderParameters(MyService.myOp, #["c", "a", "b"]));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];

      strictEqual(method.kind, "basic");
      strictEqual(method.name, "myOp");

      // Filter out contentType param to check only the user-defined params
      const userParams = method.parameters.filter((p) => p.name !== "contentType");
      strictEqual(userParams.length, 3);

      // Verify parameters are in the new order: c, a, b
      strictEqual(userParams[0].name, "c");
      strictEqual(userParams[1].name, "a");
      strictEqual(userParams[2].name, "b");
    });
  });

  describe("chaining with other functions", () => {
    it("chains addParameter and reorderParameters", async () => {
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
          alias step1 = addParameter(MyService.myOp, ExtraParams.newParam);
          #suppress "experimental-feature" "testing reorderParameters"
          @@override(MyService.myOp, reorderParameters(step1, #["newParam", "existingParam"]));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      // Filter out contentType param
      const userParams = method.parameters.filter((p) => p.name !== "contentType");

      // Verify newParam comes before existingParam
      const newParamIndex = userParams.findIndex((p) => p.name === "newParam");
      const existingParamIndex = userParams.findIndex((p) => p.name === "existingParam");
      ok(newParamIndex < existingParamIndex, "newParam should come before existingParam");
    });

    it("chains replaceParameter and reorderParameters", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query first: string, @query second?: int32): void;
          `,
          `
          model RequiredSecond {
            second: int32;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          alias step1 = replaceParameter(MyService.myOp, "second", RequiredSecond.second);
          #suppress "experimental-feature" "testing reorderParameters"
          @@override(MyService.myOp, reorderParameters(step1, #["second", "first"]));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      // Verify second is now required
      const secondParam = method.parameters.find((p) => p.name === "second");
      ok(secondParam, "second param should exist");
      strictEqual(secondParam.optional, false, "second should be required");

      // Filter out contentType param
      const userParams = method.parameters.filter((p) => p.name !== "contentType");

      // Verify second comes before first
      const secondIndex = userParams.findIndex((p) => p.name === "second");
      const firstIndex = userParams.findIndex((p) => p.name === "first");
      ok(secondIndex < firstIndex, "second should come before first");
    });
  });

  describe("scoped usage", () => {
    it("applies reorder only for specified language scope", async () => {
      const mainCode = `
        @service
        namespace MyService;

        op myOp(@query a: string, @query b: int32): void;
        `;

      const customizationCode = `
        #suppress "experimental-feature" "testing reorderParameters"
        @@override(MyService.myOp, reorderParameters(MyService.myOp, #["b", "a"]), "python");
        `;

      // Test with Python scope - should have reordered parameters
      const { program: pythonProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const pythonContext = await createSdkContextForTester(pythonProgram, {
        emitterName: "@azure-tools/typespec-python",
      });
      const pythonMethod = pythonContext.sdkPackage.clients[0].methods[0];
      const pythonParams = pythonMethod.parameters.filter((p) => p.name !== "contentType");

      strictEqual(pythonParams[0].name, "b", "Python: b should be first");
      strictEqual(pythonParams[1].name, "a", "Python: a should be second");

      // Test with C# scope - should have original order
      const { program: csharpProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const csharpContext = await createSdkContextForTester(csharpProgram, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      const csharpMethod = csharpContext.sdkPackage.clients[0].methods[0];
      const csharpParams = csharpMethod.parameters.filter((p) => p.name !== "contentType");

      strictEqual(csharpParams[0].name, "a", "C#: a should be first");
      strictEqual(csharpParams[1].name, "b", "C#: b should be second");
    });
  });

  describe("error handling", () => {
    it("reports error when order list contains non-existent parameter", async () => {
      const diagnostics = await SimpleBaseTester.diagnose(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query a: string, @query b: int32): void;
          `,
          `
          #suppress "experimental-feature" "testing reorderParameters"
          @@override(MyService.myOp, reorderParameters(MyService.myOp, #["a", "nonExistent"]));
          `,
        ),
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/reorder-parameter-not-found",
        message: /Parameter "nonExistent" specified in reorder list not found in operation "myOp"/,
      });
    });

    it("reports error when order list is missing a parameter", async () => {
      const diagnostics = await SimpleBaseTester.diagnose(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query a: string, @query b: int32): void;
          `,
          `
          #suppress "experimental-feature" "testing reorderParameters"
          @@override(MyService.myOp, reorderParameters(MyService.myOp, #["a"]));
          `,
        ),
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/reorder-parameter-missing",
        message: /Parameter "b" from operation "myOp" is missing in reorder list/,
      });
    });

    it("reports error when order list contains duplicate parameter names", async () => {
      const diagnostics = await SimpleBaseTester.diagnose(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query a: string, @query b: int32): void;
          `,
          `
          #suppress "experimental-feature" "testing reorderParameters"
          @@override(MyService.myOp, reorderParameters(MyService.myOp, #["a", "a", "b"]));
          `,
        ),
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/reorder-parameter-duplicate",
        message: /Parameter "a" appears more than once in the reorder list for operation "myOp"/,
      });
    });
  });
});
