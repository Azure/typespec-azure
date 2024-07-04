import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: load examples", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
      "examples-directory": `./examples`,
    });
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
      runner.context.experimental_sdkPackage.clients[0]
        .methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
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
      runner.context.experimental_sdkPackage.clients[0]
        .methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
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
    `
    );

    const client = runner.context.experimental_sdkPackage.clients[0];
    strictEqual(client.name, "FooClient");
    const method = client.methods[0] as SdkServiceMethod<SdkHttpOperation>;
    ok(method);
    strictEqual(method.name, "test");
    const operation = method.operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
  });
});
