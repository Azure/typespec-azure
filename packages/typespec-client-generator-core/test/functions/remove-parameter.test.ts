import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
} from "../tester.js";

describe("removeParameter", () => {
  describe("basic usage", () => {
    it("removes an optional parameter", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query required: string, @query optional?: int32): void;
          `,
          `
          #suppress "experimental-feature" "testing removeParameter"
          @@override(MyService.myOp, removeParameter(MyService.myOp, "optional"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];

      // Verify the optional parameter was removed
      const optionalParam = method.parameters.find((x) => x.name === "optional");
      strictEqual(optionalParam, undefined, "optional parameter should be removed");

      // Verify the required parameter still exists
      const requiredParam = method.parameters.find((x) => x.name === "required");
      ok(requiredParam, "required parameter should still exist");
    });

    it("removes multiple optional parameters via chaining", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query required: string, @query opt1?: int32, @query opt2?: boolean): void;
          `,
          `
          #suppress "experimental-feature" "testing removeParameter"
          alias step1 = removeParameter(MyService.myOp, "opt1");
          #suppress "experimental-feature" "testing removeParameter"
          @@override(MyService.myOp, removeParameter(step1, "opt2"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      // Verify both optional parameters were removed
      strictEqual(
        method.parameters.find((x) => x.name === "opt1"),
        undefined,
        "opt1 should be removed",
      );
      strictEqual(
        method.parameters.find((x) => x.name === "opt2"),
        undefined,
        "opt2 should be removed",
      );

      // Verify required parameter still exists
      ok(
        method.parameters.find((x) => x.name === "required"),
        "required should still exist",
      );
    });
  });

  describe("error handling", () => {
    it("reports error when trying to remove a required parameter", async () => {
      const diagnostics = await SimpleBaseTester.diagnose(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query required: string, @query optional?: int32): void;
          `,
          `
          #suppress "experimental-feature" "testing removeParameter"
          @@override(MyService.myOp, removeParameter(MyService.myOp, "required"));
          `,
        ),
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/override-parameters-mismatch",
      });
    });

    it("reports error when parameter not found", async () => {
      const [, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query existingParam: string): void;
          `,
          `
          #suppress "experimental-feature" "testing removeParameter"
          alias modified = removeParameter(MyService.myOp, "nonExistentParam");
          `,
        ),
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/remove-parameter-not-found",
        message: 'Parameter "nonExistentParam" not found in operation "myOp".',
      });
    });
  });

  describe("chaining with other functions", () => {
    it("chains removeParameter with addParameter", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query oldParam?: string): void;
          `,
          `
          model NewParams {
            newParam: int32;
          }

          #suppress "experimental-feature" "testing removeParameter"
          alias step1 = removeParameter(MyService.myOp, "oldParam");
          #suppress "experimental-feature" "testing addParameter"
          @@override(MyService.myOp, addParameter(step1, NewParams.newParam));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      // Verify oldParam was removed
      strictEqual(
        method.parameters.find((x) => x.name === "oldParam"),
        undefined,
        "oldParam should be removed",
      );

      // Verify newParam was added
      const newParam = method.parameters.find((x) => x.name === "newParam");
      ok(newParam, "newParam should exist");
      strictEqual(newParam.type.kind, "int32");
    });
  });

  describe("scoped usage", () => {
    it("applies removal only for specified language scope", async () => {
      const mainCode = `
        @service
        namespace MyService;

        op myOp(@query required: string, @query optional?: int32): void;
        `;

      const customizationCode = `
        #suppress "experimental-feature" "testing removeParameter"
        @@override(MyService.myOp, removeParameter(MyService.myOp, "optional"), "python");
        `;

      // Test with Python scope - should be removed
      const { program: pythonProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const pythonContext = await createSdkContextForTester(pythonProgram, {
        emitterName: "@azure-tools/typespec-python",
      });
      const pythonMethod = pythonContext.sdkPackage.clients[0].methods[0];
      strictEqual(
        pythonMethod.parameters.find((x) => x.name === "optional"),
        undefined,
        "optional should be removed for Python",
      );

      // Test with C# scope - should NOT be removed
      const { program: csharpProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const csharpContext = await createSdkContextForTester(csharpProgram, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      const csharpMethod = csharpContext.sdkPackage.clients[0].methods[0];
      ok(
        csharpMethod.parameters.find((x) => x.name === "optional"),
        "optional should still exist for C#",
      );
    });
  });
});
