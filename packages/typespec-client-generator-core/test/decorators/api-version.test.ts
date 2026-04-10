import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

describe("@apiVersion", () => {
  it("override parameter to be api version", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService;
      op get(
          @apiVersion
          @header("x-ms-version")
          version: string
        ): string;
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    // there will be no api version param on client, bc the service isn't versioned
    const apiVersionClientParam = sdkPackage.clients[0].clientInitialization.parameters.find(
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
    const { program } = await SimpleTester.compile(`
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
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    const apiVersionClientParam = sdkPackage.clients[0].clientInitialization.parameters.find(
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
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService;
      op get(
        @apiVersion(false)
        @query "api-version": string
      ): string;
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const apiVersionClientParam = sdkPackage.clients[0].clientInitialization.parameters.find(
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

  it("@apiVersion(false) keeps parameter on operation even when other operations have api version on client", async () => {
    const { program } = await SimpleTester.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;

      enum Versions {
        v1,
        v2,
      }

      @route("/widgets")
      op list(@query "api-version": string): string;
      @route("/check")
      op checkExistence(
        @apiVersion(false)
        @query "api-version": string
      ): string;
    `);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    // the client should have api version param from the list operation
    const apiVersionClientParam = sdkPackage.clients[0].clientInitialization.parameters.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionClientParam);
    strictEqual(apiVersionClientParam.clientDefaultValue, "v2");

    // list operation: api-version should be elevated to client (not in method params)
    const listMethod = sdkPackage.clients[0].methods.find((x) => x.name === "list");
    ok(listMethod);
    strictEqual(listMethod.kind, "basic");
    const listApiVersionParam = listMethod.parameters.find((x) => x.name === "api-version");
    ok(!listApiVersionParam);

    // checkExistence operation: api-version should stay as operation parameter
    const checkMethod = sdkPackage.clients[0].methods.find((x) => x.name === "checkExistence");
    ok(checkMethod);
    strictEqual(checkMethod.kind, "basic");
    const checkApiVersionParam = checkMethod.parameters.find((x) => x.name === "api-version");
    ok(checkApiVersionParam);
    strictEqual(checkApiVersionParam.isApiVersionParam, false);
    strictEqual(checkApiVersionParam.onClient, false);
  });
});
