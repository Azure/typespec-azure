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
  const testArrayModel = runner.context.sdkPackage.models[0];
  strictEqual(testArrayModel.kind, "model");
  strictEqual(testArrayModel.name, "TestDictionary");
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
