import { ok, strictEqual } from "assert";
import { afterEach, beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("constant types", () => {
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
  it("string", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          prop: "json";
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "constant");
    strictEqual(sdkType.valueType.kind, "string");
    strictEqual(sdkType.value, "json");
    strictEqual(sdkType.name, "TestProp");
    strictEqual(sdkType.isGeneratedName, true);
  });
  it("boolean", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          @test prop: true;
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "constant");
    strictEqual(sdkType.valueType.kind, "boolean");
    strictEqual(sdkType.value, true);
    strictEqual(sdkType.name, "TestProp");
    strictEqual(sdkType.isGeneratedName, true);
  });
  it("number", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          @test prop: 4;
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "constant");
    strictEqual(sdkType.valueType.kind, "int32");
    strictEqual(sdkType.value, 4);
    strictEqual(sdkType.name, "TestProp");
    strictEqual(sdkType.isGeneratedName, true);
  });
});
