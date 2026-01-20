import { ok, strictEqual } from "assert";
import { it } from "vitest";
import {
  AzureCoreServiceTester,
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

it("use model is to represent array", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace TestClient {
      model TestModel {
        prop: string;
      }
      model TestArray is TestModel[];

      op get(): TestArray;
    }
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.kind, "model");
  strictEqual(model.name, "TestModel");
  const client = context.sdkPackage.clients[0];
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
  const { program } = await AzureCoreServiceTester.compile(`
    model ModelWithEmbeddingVector {
      prop: EmbeddingVector<int32>;
    }

    op get(): ModelWithEmbeddingVector;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  const property = model.properties[0];
  strictEqual(property.type.kind, "array");
  strictEqual(property.type.name, "EmbeddingVector");
  strictEqual(property.type.crossLanguageDefinitionId, "Azure.Core.EmbeddingVector");
  strictEqual(property.type.valueType.kind, "int32");
});

it("alias of EmbeddingVector", async () => {
  const { program } = await AzureCoreServiceTester.compile(`
    alias MyEmbeddingVector = EmbeddingVector<int32>;

    model ModelWithEmbeddingVector {
      prop: MyEmbeddingVector;
    }

    op get(): ModelWithEmbeddingVector;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  const property = model.properties[0];
  strictEqual(property.type.kind, "array");
  strictEqual(property.type.name, "EmbeddingVector");
  strictEqual(property.type.crossLanguageDefinitionId, "Azure.Core.EmbeddingVector");
  strictEqual(property.type.valueType.kind, "int32");
});

it("same type's array come to same type", async () => {
  const { program } = await SimpleTester.compile(`
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
        prop5: Test[][];
        prop6: Test[][];
        prop7: Record<Test>[];
        prop8: Record<Test>[];
        prop9: Record<Record<Test>>[];
        prop10: Record<Record<Test>>[];
      }

      op get(): TestArray;
    }
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const testArrayModel = context.sdkPackage.models[0];
  strictEqual(testArrayModel.kind, "model");
  strictEqual(testArrayModel.name, "TestArray");
  strictEqual(testArrayModel.properties.length, 10);
  const prop1 = testArrayModel.properties[0];
  const prop2 = testArrayModel.properties[1];
  const prop3 = testArrayModel.properties[2];
  const prop4 = testArrayModel.properties[3];
  const prop5 = testArrayModel.properties[4];
  const prop6 = testArrayModel.properties[5];
  const prop7 = testArrayModel.properties[6];
  const prop8 = testArrayModel.properties[7];
  const prop9 = testArrayModel.properties[8];
  const prop10 = testArrayModel.properties[9];
  strictEqual(prop1.type, prop2.type);
  strictEqual(prop3.type, prop4.type);
  strictEqual(prop5.type, prop6.type);
  strictEqual(prop7.type, prop8.type);
  strictEqual(prop9.type, prop10.type);
});

it("recursive array type", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace TestClient {
      model Test {
        prop?: Test[];
      }

      model TestArray {
        prop: Test[];
      }

      op get(): TestArray;
    }
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const testModel = context.sdkPackage.models[1];
  strictEqual(testModel.kind, "model");
  strictEqual(testModel.name, "Test");
  strictEqual(testModel.properties.length, 1);
  const modelProp = testModel.properties[0];
  const testArrayModel = context.sdkPackage.models[0];
  strictEqual(testArrayModel.kind, "model");
  strictEqual(testArrayModel.name, "TestArray");
  strictEqual(testArrayModel.properties.length, 1);
  const prop = testArrayModel.properties[0];
  strictEqual(prop.type, modelProp.type);
});

it("array with encode", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model Foo {
      @encode(ArrayEncoding.commaDelimited)
      prop: string[];
    }

    op get(): Foo;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const model = context.sdkPackage.models[0];
  strictEqual(model.kind, "model");
  strictEqual(model.name, "Foo");
  strictEqual(model.properties.length, 1);
  const modelProp = model.properties[0];
  strictEqual(modelProp.type.kind, "array");
  strictEqual(modelProp.encode, "commaDelimited");
});

it("array with encode for enum array", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    enum Color {
      Red,
      Green,
      Blue,
    }

    model Foo {
      @encode(ArrayEncoding.commaDelimited)
      prop: Color[];
    }

    op get(): Foo;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const model = context.sdkPackage.models[0];
  strictEqual(model.kind, "model");
  strictEqual(model.name, "Foo");
  strictEqual(model.properties.length, 1);
  const modelProp = model.properties[0];
  strictEqual(modelProp.type.kind, "array");
  strictEqual(modelProp.encode, "commaDelimited");
  strictEqual(modelProp.type.valueType.kind, "enum");
});

it("array with encode for union as enum array", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    union Color {
      Red: "red",
      Green: "green",
      Blue: "blue",
      string,
    }

    model Foo {
      @encode(ArrayEncoding.commaDelimited)
      prop: Color[];
    }

    op get(): Foo;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const model = context.sdkPackage.models[0];
  strictEqual(model.kind, "model");
  strictEqual(model.name, "Foo");
  strictEqual(model.properties.length, 1);
  const modelProp = model.properties[0];
  strictEqual(modelProp.type.kind, "array");
  strictEqual(modelProp.encode, "commaDelimited");
  strictEqual(modelProp.type.valueType.kind, "enum");
  strictEqual(modelProp.type.valueType.isUnionAsEnum, true);
});
