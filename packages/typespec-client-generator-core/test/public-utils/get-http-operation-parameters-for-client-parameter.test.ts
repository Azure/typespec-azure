import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { getHttpOperationParametersForClientParameter } from "../../src/public-utils.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("API version in header", async () => {
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
      @header
      apiVersion: string
    ): string;
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
      @query
      apiVersion: string
    ): string;
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
      @path
      apiVersion: string
    ): string;
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
