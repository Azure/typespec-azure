import { Model } from "@typespec/compiler";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getCrossLanguageDefinitionId, getPropertyNames } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
it("property language projected name", async () => {
  async function helper(emitterName: string, expectedLibraryName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        @clientName("MadeForCS", "csharp")
        @clientName("MadeForJava", "java")
        @clientName("MadeForTS", "javascript")
        @clientName("made_for_python", "python")
        wasMadeFor?: string;
      }
    `)) as { MyModel: Model };
    const wasMadeFor = MyModel.properties.get("wasMadeFor");
    ok(wasMadeFor);
    deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [
      expectedLibraryName,
      "wasMadeFor",
    ]);
    strictEqual(getCrossLanguageDefinitionId(runner.context, wasMadeFor), "MyModel.wasMadeFor");
  }
  await helper("@azure-tools/typespec-csharp", "MadeForCS");
  await helper("@azure-tools/typespec-java", "MadeForJava");
  await helper("@azure-tools/typespec-python", "made_for_python");
  await helper("@azure-tools/typespec-ts", "MadeForTS");
});
it("property language projected name augmented", async () => {
  async function helper(emitterName: string, expectedLibraryName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        @clientName("MadeForCS", "csharp")
        @clientName("MadeForJava", "java")
        @clientName("MadeForTS", "javascript")
        @clientName("made_for_python", "python")
        wasMadeFor?: string;
      }
    `)) as { MyModel: Model };
    const wasMadeFor = MyModel.properties.get("wasMadeFor");
    ok(wasMadeFor);
    deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [
      expectedLibraryName,
      "wasMadeFor",
    ]);
  }
  await helper("@azure-tools/typespec-csharp", "MadeForCS");
  await helper("@azure-tools/typespec-java", "MadeForJava");
  await helper("@azure-tools/typespec-python", "made_for_python");
  await helper("@azure-tools/typespec-ts", "MadeForTS");
});
it("property client projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        @clientName("NameForAllLanguage")
        wasMadeFor?: string;
      }
    `)) as { MyModel: Model };
    const wasMadeFor = MyModel.properties.get("wasMadeFor");
    ok(wasMadeFor);
    deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [
      "NameForAllLanguage",
      "wasMadeFor",
    ]);
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-python");
  await helper("@azure-tools/typespec-ts");
});
it("property no projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        @encodedName("application/json", "madeFor")
        wasMadeFor?: string;
      }
    `)) as { MyModel: Model };
    const wasMadeFor = MyModel.properties.get("wasMadeFor");
    ok(wasMadeFor);
    deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), ["wasMadeFor", "madeFor"]);
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("property with projected client and json name", async () => {
  async function helper(emitterName: string, expectedLibraryName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        @clientName("MadeForCS", "csharp")
        @clientName("MadeForJava", "java")
        @clientName("MadeForTS", "javascript")
        @clientName("made_for_python", "python")
        @encodedName("application/json", "madeFor")
        wasMadeFor?: string;
      }
    `)) as { MyModel: Model };
    const wasMadeFor = MyModel.properties.get("wasMadeFor");
    ok(wasMadeFor);
    deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), [expectedLibraryName, "madeFor"]);
  }

  await helper("@azure-tools/typespec-csharp", "MadeForCS");
  await helper("@azure-tools/typespec-java", "MadeForJava");
  await helper("@azure-tools/typespec-python", "made_for_python");
  await helper("@azure-tools/typespec-ts", "MadeForTS");
});
it("property with projected language and json name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        @clientName("propName")
        @encodedName("application/json", "madeFor")
        wasMadeFor?: string;
      }
    `)) as { MyModel: Model };
    const wasMadeFor = MyModel.properties.get("wasMadeFor");
    ok(wasMadeFor);
    deepStrictEqual(getPropertyNames(runner.context, wasMadeFor), ["propName", "madeFor"]);
  }

  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
