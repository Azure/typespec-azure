import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ok, strictEqual } from "assert";
import { afterEach, beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: array types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });
  afterEach(async () => {
    for (const modelsOrEnums of [
      runner.context.sdkPackage.models,
      runner.context.sdkPackage.enums,
    ]) {
      for (const item of modelsOrEnums) {
        ok(item.name !== "");
      }
    }
  });
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models[0];
    strictEqual(model.kind, "model");
    strictEqual(model.name, "TestModel");
    const client = runner.context.sdkPackage.clients[0];
    ok(client);
    const method = client.methods[0];
    ok(method);
    strictEqual(method.response.kind, "method");
    strictEqual(method.response.type?.kind, "array");
    strictEqual(method.response.type?.name, "TestArray");
    strictEqual(method.response.type?.crossLanguageDefinitionId, "TestClient.TestArray");
    strictEqual(method.response.type?.valueType.kind, "model");
    strictEqual(method.response.type?.valueType.name, "TestModel");
  });

  it("EmbeddingVector from azure-core", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      "filter-out-core-models": false,
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      @service({})
      namespace TestClient {
        model ModelWithEmbeddingVector {
          prop: EmbeddingVector<int32>;
        }

        op get(): ModelWithEmbeddingVector;
      }
    `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models[0];
    const property = model.properties[0];
    strictEqual(property.type.kind, "array");
    strictEqual(property.type.name, "EmbeddingVector");
    strictEqual(property.type.crossLanguageDefinitionId, "Azure.Core.EmbeddingVector");
    strictEqual(property.type.valueType.kind, "int32");
  });

  it("alias of EmbeddingVector", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      "filter-out-core-models": false,
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      @service({})
      namespace TestClient {
        alias MyEmbeddingVector = EmbeddingVector<int32>;

        model ModelWithEmbeddingVector {
          prop: MyEmbeddingVector;
        }

        op get(): ModelWithEmbeddingVector;
      }
    `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models[0];
    const property = model.properties[0];
    strictEqual(property.type.kind, "array");
    strictEqual(property.type.name, "EmbeddingVector");
    strictEqual(property.type.crossLanguageDefinitionId, "Azure.Core.EmbeddingVector");
    strictEqual(property.type.valueType.kind, "int32");
  });
});
