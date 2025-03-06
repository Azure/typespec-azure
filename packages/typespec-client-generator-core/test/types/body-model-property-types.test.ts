import { ok, strictEqual } from "assert";
import { afterEach, beforeEach, describe, it } from "vitest";
import { isReadOnly } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkBodyModelPropertyTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: body model property types", () => {
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

  it("required", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: string | int32;
        }
      `);
    const prop = getSdkBodyModelPropertyTypeHelper(runner);
    strictEqual(prop.optional, false);
    strictEqual(isReadOnly(prop), false);
  });

  it("optional", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name?: string;
        }
      `);

    const prop = getSdkBodyModelPropertyTypeHelper(runner);
    strictEqual(prop.optional, true);
  });

  it("readonly", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          @visibility(Lifecycle.Read)
          name?: string;
        }
      `);

    const prop = getSdkBodyModelPropertyTypeHelper(runner);
    strictEqual(isReadOnly(prop), true);
  });

  it("not readonly", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          @visibility(Lifecycle.Read, Lifecycle.Create, Lifecycle.Update)
          name?: string;
        }
      `);

    const prop = getSdkBodyModelPropertyTypeHelper(runner);
    strictEqual(isReadOnly(prop), false);
  });

  it("union type", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: string | int32;
        }
      `);

    const prop = getSdkBodyModelPropertyTypeHelper(runner);
    strictEqual(prop.kind, "property");
    const sdkType = prop.type;
    strictEqual(sdkType.kind, "union");
    const variants = sdkType.variantTypes;
    strictEqual(variants.length, 2);
    strictEqual(variants[0].kind, "string");
    strictEqual(variants[1].kind, "int32");
  });
});
