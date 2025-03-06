import { deepStrictEqual, ok, strictEqual } from "assert";
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

  it("versioning", async function () {
    runner = await createSdkTestRunner({
      "api-version": "all",
      emitterName: "@azure-tools/typespec-python",
    });

    await runner.compile(`
        @versioned(Versions)
        @service(#{title: "Widget Service"})
        namespace DemoService;
        enum Versions {
          v1,
          v2,
          v3,
          v4,
        }
        @usage(Usage.input | Usage.output)
        model Test {
          @added(Versions.v1)
          @removed(Versions.v2)
          @added(Versions.v3)
          versionedProp: string;
          nonVersionedProp: string;
          @removed(Versions.v3)
          removedProp: string;
        }
      `);
    const sdkModel = runner.context.sdkPackage.models.find((x) => x.kind === "model");
    ok(sdkModel);
    strictEqual(sdkModel.kind, "model");

    const versionedProp = sdkModel.properties[0];
    deepStrictEqual(versionedProp.apiVersions, ["v1", "v3", "v4"]);

    const nonVersionedProp = sdkModel.properties[1];
    deepStrictEqual(nonVersionedProp.apiVersions, ["v1", "v2", "v3", "v4"]);

    const removedProp = sdkModel.properties[2];
    deepStrictEqual(removedProp.apiVersions, ["v1", "v2"]);
  });
});
