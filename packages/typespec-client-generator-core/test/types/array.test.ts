import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ok, strictEqual } from "assert";
import { afterEach, beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
});
afterEach(async () => {
  for (const modelsOrEnums of [runner.context.sdkPackage.models, runner.context.sdkPackage.enums]) {
    for (const item of modelsOrEnums) {
      ok(item.name !== "");
    }
  }
});
it("use model is to represent array", async () => {
  await runner.compile(`
    @service
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
    emitterName: "@azure-tools/typespec-java",
  });
  await runner.compileWithBuiltInAzureCoreService(`
    model ModelWithEmbeddingVector {
      prop: EmbeddingVector<int32>;
    }

    op get(): ModelWithEmbeddingVector;
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
    emitterName: "@azure-tools/typespec-java",
  });
  await runner.compileWithBuiltInAzureCoreService(`
    alias MyEmbeddingVector = EmbeddingVector<int32>;

    model ModelWithEmbeddingVector {
      prop: MyEmbeddingVector;
    }

    op get(): ModelWithEmbeddingVector;
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

it("same type's array come to same type", async () => {
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        prop: string;
      }

      model TestArray {
        prop1: Test[];
        prop2: Test[];
        prop3: string[];
        prop4: string[];
      }

      op get(): TestArray;
    }
  `);
  const testArrayModel = runner.context.sdkPackage.models[0];
  strictEqual(testArrayModel.kind, "model");
  strictEqual(testArrayModel.name, "TestArray");
  strictEqual(testArrayModel.properties.length, 4);
  const prop1 = testArrayModel.properties[0];
  const prop2 = testArrayModel.properties[1];
  const prop3 = testArrayModel.properties[2];
  const prop4 = testArrayModel.properties[3];
  strictEqual(prop1.type, prop2.type);
  strictEqual(prop3.type, prop4.type);
});
