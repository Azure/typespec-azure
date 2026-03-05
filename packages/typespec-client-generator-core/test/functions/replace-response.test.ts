import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
} from "../tester.js";

describe("replaceResponse", () => {
  describe("basic usage", () => {
    it("compiles without errors when using replaceResponse", async () => {
      // Note: replaceResponse creates an operation with a different return type,
      // but the $override decorator primarily focuses on parameter matching.
      // This test verifies the function compiles correctly.
      const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op getData(): string;
          `,
          `
          model CustomResponse {
            data: string;
            metadata: Record<string>;
          }

          #suppress "experimental-feature" "testing replaceResponse"
          @@override(MyService.getData, replaceResponse(MyService.getData, CustomResponse));
          `,
        ),
      );

      expectDiagnosticEmpty(diagnostics);

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];

      strictEqual(method.kind, "basic");
      strictEqual(method.name, "getData");
      ok(method.response, "method should have a response");
    });
  });

  describe("chaining with replaceParameter", () => {
    it("chains replaceParameter and replaceResponse - verifies parameter change", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query param?: string): string;
          `,
          `
          model RequiredParam {
            param: string;
          }

          model CustomResponse {
            result: string;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          alias step1 = replaceParameter(MyService.myOp, "param", RequiredParam.param);
          #suppress "experimental-feature" "testing replaceResponse"
          @@override(MyService.myOp, replaceResponse(step1, CustomResponse));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      // Verify parameter was made required (this is what $override handles)
      const paramParam = method.parameters.find((x) => x.name === "param");
      ok(paramParam, "param should exist");
      strictEqual(paramParam.optional, false, "param should now be required");
    });
  });

  describe("scoped usage", () => {
    it("compiles correctly with language-specific scope", async () => {
      const mainCode = `
        @service
        namespace MyService;

        op getData(): string;
        `;

      const customizationCode = `
        model PythonResponse {
          data: string;
        }

        #suppress "experimental-feature" "testing replaceResponse"
        @@override(MyService.getData, replaceResponse(MyService.getData, PythonResponse), "python");
        `;

      // Test with Python scope
      const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
        createClientCustomizationInput(mainCode, customizationCode),
      );

      expectDiagnosticEmpty(diagnostics);

      const pythonContext = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-python",
      });
      const pythonMethod = pythonContext.sdkPackage.clients[0].methods[0];
      ok(pythonMethod, "method should exist for Python");
      strictEqual(pythonMethod.name, "getData");
    });
  });
});
