import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
} from "../tester.js";

describe("replaceParameter", () => {
  describe("making parameter required", () => {
    it("makes an optional parameter required via @@override", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace KeyVault;

          op getSecrets(@query maxResults?: int32): void;
          `,
          `
          model RequiredMaxResults {
            maxResults: int32;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          @@override(KeyVault.getSecrets, replaceParameter(KeyVault.getSecrets, "maxResults", RequiredMaxResults.maxResults));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const client = sdkPackage.clients[0];
      strictEqual(client.methods.length, 1);

      const method = client.methods[0];
      strictEqual(method.kind, "basic");
      strictEqual(method.name, "getSecrets");

      // Find the maxResults parameter in method params
      const maxResultsParam = method.parameters.find((x) => x.name === "maxResults");
      ok(maxResultsParam, "maxResults parameter should exist");
      strictEqual(maxResultsParam.optional, false, "maxResults should now be required");
      strictEqual(maxResultsParam.type.kind, "int32");

      // Verify the operation parameter still exists and maps to the method param
      const opMaxResultsParam = method.operation.parameters.find((x) => x.name === "maxResults");
      ok(opMaxResultsParam, "maxResults should exist in operation params");
      strictEqual(
        opMaxResultsParam.correspondingMethodParams.length,
        1,
        "should have one corresponding method param",
      );
      strictEqual(
        opMaxResultsParam.correspondingMethodParams[0],
        maxResultsParam,
        "operation param should map to method param",
      );
    });

    it("makes multiple parameters required via chained replaceParameter calls", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op search(@query query?: string, @query limit?: int32): void;
          `,
          `
          model RequiredParams {
            query: string;
            limit: int32;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          alias step1 = replaceParameter(MyService.search, "query", RequiredParams.query);
          #suppress "experimental-feature" "testing replaceParameter"
          @@override(MyService.search, replaceParameter(step1, "limit", RequiredParams.limit));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];

      const queryParam = method.parameters.find((x) => x.name === "query");
      ok(queryParam, "query parameter should exist");
      strictEqual(queryParam.optional, false, "query should now be required");

      const limitParam = method.parameters.find((x) => x.name === "limit");
      ok(limitParam, "limit parameter should exist");
      strictEqual(limitParam.optional, false, "limit should now be required");
    });
  });

  describe("error handling", () => {
    it("reports error when parameter not found", async () => {
      const [, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op myOp(@query existingParam: string): void;
          `,
          `
          model NewParams {
            replacement: int32;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          alias modified = replaceParameter(MyService.myOp, "nonExistentParam", NewParams.replacement);
          `,
        ),
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/replace-parameter-not-found",
        message: 'Parameter "nonExistentParam" not found in operation "myOp".',
      });
    });
  });

  describe("preserves other parameters", () => {
    it("preserves other parameters when replacing one and verifies mappings", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op multiParam(
            @query param1: string,
            @query param2?: int32,
            @query param3: boolean
          ): void;
          `,
          `
          model RequiredParam2 {
            param2: int32;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          @@override(MyService.multiParam, replaceParameter(MyService.multiParam, "param2", RequiredParam2.param2));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];

      // Verify all parameters exist in method
      const param1 = method.parameters.find((x) => x.name === "param1");
      ok(param1, "param1 should exist");
      strictEqual(param1.optional, false, "param1 should remain required");

      const param2 = method.parameters.find((x) => x.name === "param2");
      ok(param2, "param2 should exist");
      strictEqual(param2.optional, false, "param2 should now be required");

      const param3 = method.parameters.find((x) => x.name === "param3");
      ok(param3, "param3 should exist");
      strictEqual(param3.optional, false, "param3 should remain required");

      // Verify all operation parameters map correctly to method parameters
      const opParam1 = method.operation.parameters.find((x) => x.name === "param1");
      ok(opParam1, "param1 should exist in operation params");
      strictEqual(opParam1.correspondingMethodParams.length, 1);
      strictEqual(opParam1.correspondingMethodParams[0], param1);

      const opParam2 = method.operation.parameters.find((x) => x.name === "param2");
      ok(opParam2, "param2 should exist in operation params");
      strictEqual(opParam2.correspondingMethodParams.length, 1);
      strictEqual(opParam2.correspondingMethodParams[0], param2);

      const opParam3 = method.operation.parameters.find((x) => x.name === "param3");
      ok(opParam3, "param3 should exist in operation params");
      strictEqual(opParam3.correspondingMethodParams.length, 1);
      strictEqual(opParam3.correspondingMethodParams[0], param3);
    });
  });

  describe("scoped usage", () => {
    it("applies override only for specified language scope", async () => {
      const mainCode = `
        @service
        namespace KeyVault;

        op getSecrets(@query maxResults?: int32): void;
        `;

      const customizationCode = `
        model RequiredMaxResults {
          maxResults: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(KeyVault.getSecrets, replaceParameter(KeyVault.getSecrets, "maxResults", RequiredMaxResults.maxResults), "python");
        `;

      // Test with Python scope - should be overridden
      const { program: pythonProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const pythonContext = await createSdkContextForTester(pythonProgram, {
        emitterName: "@azure-tools/typespec-python",
      });
      const pythonMethod = pythonContext.sdkPackage.clients[0].methods[0];
      const pythonParam = pythonMethod.parameters.find((x) => x.name === "maxResults");
      ok(pythonParam, "maxResults should exist for Python");
      strictEqual(pythonParam.optional, false, "maxResults should be required for Python");

      // Test with C# scope - should NOT be overridden
      const { program: csharpProgram } = await SimpleBaseTester.compile(
        createClientCustomizationInput(mainCode, customizationCode),
      );
      const csharpContext = await createSdkContextForTester(csharpProgram, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      const csharpMethod = csharpContext.sdkPackage.clients[0].methods[0];
      const csharpParam = csharpMethod.parameters.find((x) => x.name === "maxResults");
      ok(csharpParam, "maxResults should exist for C#");
      strictEqual(csharpParam.optional, true, "maxResults should remain optional for C#");
    });
  });

  describe("complex scenarios", () => {
    it("chain three replaceParameter calls", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          op complexOp(
            @query param1?: string,
            @query param2?: int32,
            @query param3?: boolean
          ): void;
          `,
          `
          model RequiredParams {
            param1: string;
            param2: int32;
            param3: boolean;
          }

          #suppress "experimental-feature" "testing replaceParameter"
          alias step1 = replaceParameter(MyService.complexOp, "param1", RequiredParams.param1);
          #suppress "experimental-feature" "testing replaceParameter"
          alias step2 = replaceParameter(step1, "param2", RequiredParams.param2);
          #suppress "experimental-feature" "testing replaceParameter"
          @@override(MyService.complexOp, replaceParameter(step2, "param3", RequiredParams.param3));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const method = context.sdkPackage.clients[0].methods[0];

      for (const paramName of ["param1", "param2", "param3"]) {
        const param = method.parameters.find((x) => x.name === paramName);
        ok(param, `${paramName} should exist`);
        strictEqual(param.optional, false, `${paramName} should be required`);
      }
    });
  });
});
