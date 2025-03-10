import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("@apiVersion", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("@apiVersion", () => {
    it("override parameter to be api version", async () => {
      await runner.compile(`
        @service
        namespace MyService;
        op get(
            @apiVersion
            @header("x-ms-version")
            version: string
          ): string;
      `);
      const sdkPackage = runner.context.sdkPackage;
      // there will be no api version param on client, bc the service isn't versioned
      const apiVersionClientParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.name === "version",
      );
      ok(!apiVersionClientParam);
      const method = sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "basic");
      const apiVersionParam = method.parameters.find((x) => x.name === "version");
      ok(apiVersionParam);
      strictEqual(apiVersionParam.isApiVersionParam, true);
    });

    it("override api version param defaults to latest api version", async () => {
      await runner.compile(`
        @service(#{
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
          v3,
        }
        op get(
          @apiVersion
          @header("x-ms-version")
          version: string
        ): string;
      `);
      const sdkPackage = runner.context.sdkPackage;

      const apiVersionClientParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.name === "version",
      );
      ok(apiVersionClientParam);
      strictEqual(apiVersionClientParam?.clientDefaultValue, "v3");
      strictEqual(apiVersionClientParam.isApiVersionParam, true);
      const method = sdkPackage.clients[0].methods[0];

      // since the api version param is elevated to client, it should not be present in the method
      strictEqual(method.kind, "basic");
      const apiVersionParam = method.parameters.find((x) => x.name === "version");
      ok(!apiVersionParam);
      const apiVersionOpParam = method.operation.parameters.find((x) => x.name === "version");
      ok(apiVersionOpParam);
      strictEqual(apiVersionOpParam.isApiVersionParam, true);
      strictEqual(apiVersionOpParam.correspondingMethodParams[0], apiVersionClientParam);
    });

    it("override parameter to not be api version", async () => {
      await runner.compile(`
        @service
        namespace MyService;
        op get(
          @apiVersion(false)
          @query "api-version": string
        ): string;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const apiVersionClientParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.name === "api-version",
      );
      // there will be no api version param on client, bc we overrode it to not be api version
      ok(!apiVersionClientParam);
      const method = sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "basic");
      const apiVersionParam = method.parameters.find((x) => x.name === "api-version");
      ok(apiVersionParam);
      strictEqual(apiVersionParam.isApiVersionParam, false);
    });
  });
});
