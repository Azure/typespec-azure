import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: responses", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("content type shall be included in response headers", async () => {
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): OkResponse & {@header("Content-Type") contentType: string; @bodyRoot body: bytes};
      }
    `);
    const client = runner.context.experimental_sdkPackage.clients[0];
    ok(client);
    const method = client.methods[0];
    ok(method);
    strictEqual(method.kind, "basic");
    const responses = Array.from(method.operation.responses.values());
    strictEqual(responses.length, 1);
    strictEqual(responses[0].headers.length, 1);
    strictEqual(responses[0].headers[0].serializedName, "Content-Type");
  });

  it("description shall be included in response", async () => {
    await runner.compile(`
      @service({})
      namespace TestClient {
        op get(): Test;

        @doc("description on response")
        model Test {
          @body body: string;
        }
      }
    `);
    const client = runner.context.experimental_sdkPackage.clients[0];
    ok(client);
    const method = client.methods[0];
    ok(method);
    strictEqual(method.kind, "basic");
    const responses = Array.from(method.operation.responses.values());
    strictEqual(responses.length, 1);
    strictEqual(responses[0].description, "description on response");
  });
});
