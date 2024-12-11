import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("@isApiVersion", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("@isApiVersion", () => {
    it("override parameter to be api version", async () => {
      await runner.compile(`
        @service({})
        namespace MyService;
        op get(
            @isApiVersion
            @header("x-ms-version")
            version: string
          ): string;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "basic");
      const apiVersionParam = method.parameters.find((x) => x.name === "version");
      ok(apiVersionParam);
      strictEqual(apiVersionParam.isApiVersionParam, true);
    });
    it("override parameter to not be api version", async () => {
      await runner.compile(`
        @service({})
        namespace MyService;
        op get(
            @isApiVersion(false)
            @query "api-version": string
          ): string;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "basic");
      const apiVersionParam = method.parameters.find((x) => x.name === "api-version");
      ok(apiVersionParam);
      strictEqual(apiVersionParam.isApiVersionParam, false);
    });
  });
});
