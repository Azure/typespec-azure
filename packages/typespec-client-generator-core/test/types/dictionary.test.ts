import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
});

it("same type's dictionary come to same type", async () => {
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        prop: string;
      }

      model TestDictionary {
        prop1: Record<Test>;
        prop2: Record<Test>;
        prop3: Record<string>;
        prop4: Record<string>;
        prop5: Record<Test[]>;
        prop6: Record<Test[]>;
        prop7: Record<Record<Test>>;
        prop8: Record<Record<Test>>;
        prop9: Record<Test[][]>;
        prop10: Record<Test[][]>;
      }
      op get(): TestDictionary;
    }
  `);
  const testDictionaryModel = runner.context.sdkPackage.models[0];
  strictEqual(testDictionaryModel.kind, "model");
  strictEqual(testDictionaryModel.name, "TestDictionary");
  strictEqual(testDictionaryModel.properties.length, 10);
  const prop1 = testDictionaryModel.properties[0];
  const prop2 = testDictionaryModel.properties[1];
  const prop3 = testDictionaryModel.properties[2];
  const prop4 = testDictionaryModel.properties[3];
  const prop5 = testDictionaryModel.properties[4];
  const prop6 = testDictionaryModel.properties[5];
  const prop7 = testDictionaryModel.properties[6];
  const prop8 = testDictionaryModel.properties[7];
  const prop9 = testDictionaryModel.properties[8];
  const prop10 = testDictionaryModel.properties[9];
  strictEqual(prop1.type, prop2.type);
  strictEqual(prop3.type, prop4.type);
  strictEqual(prop5.type, prop6.type);
  strictEqual(prop7.type, prop8.type);
  strictEqual(prop9.type, prop10.type);
});

it("recursive dictionary type", async () => {
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        prop?: Record<Test>;
      }

      model TestDictionary {
        prop: Record<Test>;
      }
      op get(): TestDictionary;
    }
  `);
  const testModel = runner.context.sdkPackage.models[1];
  strictEqual(testModel.kind, "model");
  strictEqual(testModel.name, "Test");
  strictEqual(testModel.properties.length, 1);
  const modelProp = testModel.properties[0];
  const testDictionaryModel = runner.context.sdkPackage.models[0];
  strictEqual(testDictionaryModel.kind, "model");
  strictEqual(testDictionaryModel.name, "TestDictionary");
  strictEqual(testDictionaryModel.properties.length, 1);
  const prop = testDictionaryModel.properties[0];
  strictEqual(prop.type, modelProp.type);
});
