import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { SimpleTesterWithService } from "../tester.js";

describe("addParameter", () => {
  describe("basic usage", () => {
    it("adds a new parameter to an operation", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op myOp(@query existingParam: string): void;

        model ExtraParams {
          @header("X-Trace-Id") tracingId: string;
        }

        #suppress "experimental-feature" "testing addParameter"
        @@override(myOp, addParameter(myOp, ExtraParams.tracingId));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("can use addParameter result in alias", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op myOp(@query param: string): void;

        model ExtraParams {
          newParam: int32;
        }

        #suppress "experimental-feature" "testing addParameter"
        alias modifiedOp = addParameter(myOp, ExtraParams.newParam);
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });
  });

  describe("chaining with replaceParameter", () => {
    it("chains replaceParameter and addParameter", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op myOp(@query oldParam?: string): void;

        model NewParams {
          oldParam: string;
          newParam: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        alias step1 = replaceParameter(myOp, "oldParam", NewParams.oldParam);
        #suppress "experimental-feature" "testing addParameter"
        @@override(myOp, addParameter(step1, NewParams.newParam));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });
  });

  describe("complex scenarios", () => {
    it("works with operations in interface (alias)", async () => {
      // Note: addParameter creates an operation with additional parameters,
      // which may not be compatible with @@override's parameter matching requirements.
      // Testing with alias to verify the function works correctly.
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        interface MyService {
          op myOp(@query param: string): void;
        }

        model ExtraParams {
          extraParam: int32;
        }

        #suppress "experimental-feature" "testing addParameter"
        alias modifiedOp = addParameter(MyService.myOp, ExtraParams.extraParam);
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("works with language-specific scope", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op myOp(@query param: string): void;

        model ExtraParams {
          pythonOnlyParam: string;
        }

        #suppress "experimental-feature" "testing addParameter"
        @@override(myOp, addParameter(myOp, ExtraParams.pythonOnlyParam), "python");
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("adds multiple parameters via chaining", async () => {
      const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(`
        op myOp(@query param: string): void;

        model ExtraParams {
          param1: int32;
          param2: boolean;
        }

        #suppress "experimental-feature" "testing addParameter"
        alias step1 = addParameter(myOp, ExtraParams.param1);
        #suppress "experimental-feature" "testing addParameter"
        @@override(myOp, addParameter(step1, ExtraParams.param2));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });
  });
});
