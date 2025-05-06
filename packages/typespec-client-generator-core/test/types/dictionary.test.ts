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
      }
      op get(): TestDictionary;
    }
  `);
  const testArrayModel = runner.context.sdkPackage.models[0];
  strictEqual(testArrayModel.kind, "model");
  strictEqual(testArrayModel.name, "TestDictionary");
  strictEqual(testArrayModel.properties.length, 6);
  const prop1 = testArrayModel.properties[0];
  const prop2 = testArrayModel.properties[1];
  const prop3 = testArrayModel.properties[2];
  const prop4 = testArrayModel.properties[3];
  const prop5 = testArrayModel.properties[4];
  const prop6 = testArrayModel.properties[5];
  strictEqual(prop1.type, prop2.type);
  strictEqual(prop3.type, prop4.type);
  strictEqual(prop5.type, prop6.type);
});
