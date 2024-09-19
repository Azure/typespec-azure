import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkClientAccessor, SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: load examples", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
      "examples-dir": `./examples`,
    });
  });

  it("example config", async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
      "examples-directory": `./examples`,
    });

    await runner.host.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): string;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples![0].filePath, "get.json");
  });

  it("example default config", async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
    });

    await runner.host.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): string;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples![0].filePath, "get.json");
  });

  it("no example folder found", async () => {
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): string;
      }
    `);

    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-loading",
    });
  });

  it("load example without version", async () => {
    await runner.host.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): string;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples![0].filePath, "get.json");
  });

  it("load example with version", async () => {
    await runner.host.addRealTypeSpecFile("./examples/v3/get.json", `${__dirname}/load/get.json`);
    await runner.compile(`
      @service({})
      @versioned(Versions)
      namespace TestClient {
        op get(): string;
      }

      enum Versions {
        v1,
        v2,
        v3,
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples![0].filePath, "v3/get.json");
  });

  it("load multiple example for one operation", async () => {
    await runner.host.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
    await runner.host.addRealTypeSpecFile(
      "./examples/getAnother.json",
      `${__dirname}/load/getAnother.json`,
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): string;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 2);
    strictEqual(operation.examples![0].filePath, "get.json");
    strictEqual(operation.examples![1].filePath, "getAnother.json");
  });

  it("load example with client customization", async () => {
    await runner.host.addRealTypeSpecFile("./examples/get.json", `${__dirname}/load/get.json`);
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): string;
      }
    `);

    await runner.compileWithCustomization(
      `
      @service({})
      namespace TestClient {
        op get(): string;
      }
    `,
      `
      @client({
        name: "FooClient",
        service: TestClient
      })
      namespace Customizations {
        op test is TestClient.get;
      }
    `,
    );

    const client = runner.context.sdkPackage.clients[0];
    strictEqual(client.name, "FooClient");
    const method = client.methods[0] as SdkServiceMethod<SdkHttpOperation>;
    ok(method);
    strictEqual(method.name, "test");
    const operation = method.operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
  });

  it("load multiple example with @clientName", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/clientName.json",
      `${__dirname}/load/clientName.json`,
    );
    await runner.host.addRealTypeSpecFile(
      "./examples/clientNameAnother.json",
      `${__dirname}/load/clientNameAnother.json`,
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        @clientName("renamedNS")
        namespace NS {
          @route("/ns")
          @clientName("renamedOP")
          op get(): string;
        }

        @clientName("renamedIF")
        namespace IF {
          @route("/if")
          @clientName("renamedOP")
          op get(): string;
        }
      }
    `);

    let operation = (
      (runner.context.sdkPackage.clients[0].methods[0] as SdkClientAccessor<SdkHttpOperation>)
        .response.methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    operation = (
      (runner.context.sdkPackage.clients[0].methods[1] as SdkClientAccessor<SdkHttpOperation>)
        .response.methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
  });
});
