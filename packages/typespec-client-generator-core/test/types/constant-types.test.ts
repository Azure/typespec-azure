import { strictEqual } from "assert";
import { describe, beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  describe("SdkConstantType", () => {
    it("string", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
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
        @access(Access.public)
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
        @access(Access.public)
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
});
