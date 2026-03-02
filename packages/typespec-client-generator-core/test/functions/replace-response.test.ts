import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { SimpleTesterWithService } from "../tester.js";

describe("replaceResponse", () => {
  describe("basic usage", () => {
    it("replaces return type with a different model", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op getData(): string;

        model CustomResponse {
          data: string;
          metadata: Record<string>;
        }

        #suppress "experimental-feature" "testing replaceResponse"
        @@override(getData, replaceResponse(getData, CustomResponse));
      `);

      const nonExperimentalDiags = diagnostics.filter(d => d.code !== "experimental-feature");
      strictEqual(nonExperimentalDiags.length, 0, "Should have no errors: " + JSON.stringify(nonExperimentalDiags.map(d => ({code: d.code, message: d.message}))));
    });

    it("can use replaceResponse result in alias", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op getData(): string;

        model CustomResponse {
          data: string;
        }

        #suppress "experimental-feature" "testing replaceResponse"
        alias modifiedOp = replaceResponse(getData, CustomResponse);
      `);

      const nonExperimentalDiags = diagnostics.filter(d => d.code !== "experimental-feature");
      strictEqual(nonExperimentalDiags.length, 0, "Should have no errors: " + JSON.stringify(nonExperimentalDiags.map(d => ({code: d.code, message: d.message}))));
    });
  });

  describe("chaining with replaceParameter", () => {
    it("chains replaceParameter and replaceResponse", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op myOp(@query param?: string): string;

        model RequiredParam {
          param: string;
        }

        model CustomResponse {
          result: string;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        alias step1 = replaceParameter(myOp, "param", RequiredParam.param);
        #suppress "experimental-feature" "testing replaceResponse"
        @@override(myOp, replaceResponse(step1, CustomResponse));
      `);

      const nonExperimentalDiags = diagnostics.filter(d => d.code !== "experimental-feature");
      strictEqual(nonExperimentalDiags.length, 0, "Should have no errors: " + JSON.stringify(nonExperimentalDiags.map(d => ({code: d.code, message: d.message}))));
    });
  });

  describe("complex scenarios", () => {
    it("works with operations in interface", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        interface MyService {
          op getData(): string;
        }

        model CustomResponse {
          data: string;
        }

        #suppress "experimental-feature" "testing replaceResponse"
        @@override(MyService.getData, replaceResponse(MyService.getData, CustomResponse));
      `);

      const nonExperimentalDiags = diagnostics.filter(d => d.code !== "experimental-feature");
      strictEqual(nonExperimentalDiags.length, 0, "Should have no errors: " + JSON.stringify(nonExperimentalDiags.map(d => ({code: d.code, message: d.message}))));
    });

    it("works with language-specific scope", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op getData(): string;

        model PythonResponse {
          data: string;
        }

        #suppress "experimental-feature" "testing replaceResponse"
        @@override(getData, replaceResponse(getData, PythonResponse), "python");
      `);

      const nonExperimentalDiags = diagnostics.filter(d => d.code !== "experimental-feature");
      strictEqual(nonExperimentalDiags.length, 0, "Should have no errors: " + JSON.stringify(nonExperimentalDiags.map(d => ({code: d.code, message: d.message}))));
    });
  });
});
