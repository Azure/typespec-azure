import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  describe("SdkArrayType", () => {
    it("use model is to represent array", async () => {
      await runner.compile(`
        @service({})
        namespace TestClient {
          model TestModel {
            prop: string;
          }
          model TestArray is TestModel[];

          op get(): TestArray;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.kind, "model");
      strictEqual(model.name, "TestModel");
      const client = runner.context.experimental_sdkPackage.clients[0];
      ok(client);
      const method = client.methods[0];
      ok(method);
      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type?.kind, "array");
      strictEqual(method.response.type?.valueType.kind, "model");
      strictEqual(method.response.type?.valueType.name, "TestModel");
    });
  });
});
