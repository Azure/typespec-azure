import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getHttpOperationParametersForClientParameter } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("API version in header", async () => {
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
      @header
      apiVersion: string
    ): string;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  const apiVersionParameter = client.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );

  ok(apiVersionParameter);
  strictEqual(apiVersionParameter.kind, "method");

  const httpParam = getHttpOperationParametersForClientParameter(client, apiVersionParameter)[0];
  ok(httpParam);

  strictEqual(
    httpParam,
    client.methods[0].operation.parameters.find((p) => p.name === "apiVersion"),
  );
});

it("API version in query", async () => {
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
      @query
      apiVersion: string
    ): string;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  const apiVersionParameter = client.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );

  ok(apiVersionParameter);
  strictEqual(apiVersionParameter.kind, "method");

  const httpParam = getHttpOperationParametersForClientParameter(client, apiVersionParameter)[0];
  ok(httpParam);

  strictEqual(
    httpParam,
    client.methods[0].operation.parameters.find((p) => p.name === "apiVersion"),
  );
});

it("API version in path", async () => {
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
      @path
      apiVersion: string
    ): string;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  const apiVersionParameter = client.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );

  ok(apiVersionParameter);
  strictEqual(apiVersionParameter.kind, "method");

  const httpParam = getHttpOperationParametersForClientParameter(client, apiVersionParameter)[0];
  ok(httpParam);

  strictEqual(
    httpParam,
    client.methods[0].operation.parameters.find((p) => p.name === "apiVersion"),
  );
});

it("API version mix", async () => {
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

    @route("/foo")
    op foo(
      @query
      apiVersion: string
    ): string;

    @route("/bar")
    op bar(
      @header
      apiVersion: string
    ): string;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  const apiVersionParameter = client.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );

  ok(apiVersionParameter);
  strictEqual(apiVersionParameter.kind, "method");

  const httpParams = getHttpOperationParametersForClientParameter(client, apiVersionParameter);
  ok(httpParams);

  strictEqual(httpParams.length, 2);

  strictEqual(
    httpParams[0],
    client.methods[0].operation.parameters.find((p) => p.name === "apiVersion"),
  );

  strictEqual(
    httpParams[1],
    client.methods[1].operation.parameters.find((p) => p.name === "apiVersion"),
  );
});
