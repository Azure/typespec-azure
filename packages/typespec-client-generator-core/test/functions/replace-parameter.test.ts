import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { SimpleTesterWithService } from "../tester.js";

describe("replaceParameter", () => {
  describe("making parameter required (gist example)", () => {
    it("makes an optional parameter required via @@override", async () => {
      // This is the primary use case from the gist:
      // Making maxResults required when it was optional
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op getSecrets(@query maxResults?: int32): void;

        model RequiredMaxResults {
          maxResults: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(getSecrets, replaceParameter(getSecrets, "maxResults", RequiredMaxResults.maxResults));
      `);

      // Filter out experimental-feature diagnostics
      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("makes multiple parameters required via chained replaceParameter calls", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op search(@query query?: string, @query limit?: int32, @query offset?: int32): void;

        model RequiredParams {
          query: string;
          limit: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        alias step1 = replaceParameter(search, "query", RequiredParams.query);
        #suppress "experimental-feature" "testing replaceParameter"
        @@override(search, replaceParameter(step1, "limit", RequiredParams.limit));
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

  describe("error handling", () => {
    it("reports error when parameter not found", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op myOp(@query existingParam: string): void;

        model NewParams {
          replacement: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        alias modified = replaceParameter(myOp, "nonExistentParam", NewParams.replacement);
      `);

      const errorDiags = diagnostics.filter(
        (d) => d.code === "@azure-tools/typespec-client-generator-core/replace-parameter-not-found",
      );
      strictEqual(
        errorDiags.length,
        1,
        "Should have one replace-parameter-not-found error. All diagnostics: " +
          JSON.stringify(diagnostics.map((d) => ({ code: d.code, message: d.message }))),
      );
      ok(
        errorDiags[0].message.includes("nonExistentParam"),
        "Error message should mention the parameter name",
      );
    });
  });

  describe("basic usage with alias", () => {
    it("can use replaceParameter result in alias", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op myOp(@query param1: string, @query param2?: int32): void;

        model NewParams {
          param2: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        alias modifiedOp = replaceParameter(myOp, "param2", NewParams.param2);
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

  describe("corner cases", () => {
    it("works with operation that has single parameter", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op singleParam(@query param?: int32): void;

        model RequiredParam {
          param: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(singleParam, replaceParameter(singleParam, "param", RequiredParam.param));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("preserves other parameters when replacing one", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op multiParam(
          @query param1: string,
          @query param2?: int32,
          @query param3: boolean
        ): void;

        model RequiredParam2 {
          param2: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(multiParam, replaceParameter(multiParam, "param2", RequiredParam2.param2));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("works with path parameters", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        @route("/items/{id}")
        op getItem(@path id?: string): void;

        model RequiredId {
          id: string;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(getItem, replaceParameter(getItem, "id", RequiredId.id));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("works with header parameters", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op headerOp(@header("X-Custom-Header") customHeader?: string): void;

        model RequiredHeader {
          customHeader: string;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(headerOp, replaceParameter(headerOp, "customHeader", RequiredHeader.customHeader));
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

  describe("scoped usage", () => {
    it("works with language-specific scope", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op getSecrets(@query maxResults?: int32): void;

        model RequiredMaxResults {
          maxResults: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(getSecrets, replaceParameter(getSecrets, "maxResults", RequiredMaxResults.maxResults), "python");
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
    it("works with operations in interface", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        interface KeyVault {
          op getSecrets(@query maxResults?: int32): void;
        }

        model RequiredMaxResults {
          maxResults: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(KeyVault.getSecrets, replaceParameter(KeyVault.getSecrets, "maxResults", RequiredMaxResults.maxResults));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("works with operations in nested namespace", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        namespace Inner {
          op getSecrets(@query maxResults?: int32): void;
        }

        model RequiredMaxResults {
          maxResults: int32;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        @@override(Inner.getSecrets, replaceParameter(Inner.getSecrets, "maxResults", RequiredMaxResults.maxResults));
      `);

      const nonExperimentalDiags = diagnostics.filter((d) => d.code !== "experimental-feature");
      strictEqual(
        nonExperimentalDiags.length,
        0,
        "Should have no errors: " +
          JSON.stringify(nonExperimentalDiags.map((d) => ({ code: d.code, message: d.message }))),
      );
    });

    it("chain three replaceParameter calls", async () => {
      const diagnostics = await SimpleTesterWithService.diagnose(`
        op complexOp(
          @query param1?: string,
          @query param2?: int32,
          @query param3?: boolean
        ): void;

        model RequiredParams {
          param1: string;
          param2: int32;
          param3: boolean;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        alias step1 = replaceParameter(complexOp, "param1", RequiredParams.param1);
        #suppress "experimental-feature" "testing replaceParameter"
        alias step2 = replaceParameter(step1, "param2", RequiredParams.param2);
        #suppress "experimental-feature" "testing replaceParameter"
        @@override(complexOp, replaceParameter(step2, "param3", RequiredParams.param3));
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
