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

  it("names", async function () {
    await runner.compileWithBuiltInService(`
      #suppress "deprecated" "for testing"
      @test
      @projectedName("java", "JavaTest")
      model Test {
        @projectedName("java", "javaProjectedName")
        javaWireName: string;
        @projectedName("client", "clientName")
        clientProjectedName: string;
        #suppress "deprecated" "for testing"
        @projectedName("json", "projectedWireName")
        @encodedName("application/json", "encodedWireName")
        jsonEncodedAndProjectedName: string;
        #suppress "deprecated" "for testing"
        @projectedName("json", "realWireName")
        jsonProjectedName: string; // deprecated
        regular: string;
      }

      op test(): Test;
    `);

    const sdkModel = runner.context.sdkPackage.models[0];
    strictEqual(sdkModel.name, "JavaTest");

    // Java projected name test
    const javaProjectedProp = sdkModel.properties.find((x) => x.name === "javaProjectedName");
    ok(javaProjectedProp);
    strictEqual(javaProjectedProp.kind, "property");
    strictEqual(javaProjectedProp.serializedName, "javaWireName");
    strictEqual(javaProjectedProp.serializationOptions.json?.name, "javaWireName");

    // client projected name test

    const clientProjectedProp = sdkModel.properties.find((x) => x.name === "clientName");
    ok(clientProjectedProp);
    strictEqual(clientProjectedProp.kind, "property");
    strictEqual(clientProjectedProp.serializedName, "clientProjectedName");
    strictEqual(clientProjectedProp.serializationOptions.json?.name, "clientProjectedName");

    // wire name test with encoded and projected
    const jsonEncodedProp = sdkModel.properties.find(
      (x) => x.kind === "property" && x.serializedName === "encodedWireName",
    );
    ok(jsonEncodedProp);
    strictEqual(jsonEncodedProp.name, "jsonEncodedAndProjectedName");
    strictEqual(jsonEncodedProp.kind, "property");
    strictEqual(jsonEncodedProp.serializationOptions.json?.name, "encodedWireName");

    // wire name test with deprecated projected
    const jsonProjectedProp = sdkModel.properties.find(
      (x) => x.kind === "property" && x.serializedName === "realWireName",
    );
    ok(jsonProjectedProp);
    strictEqual(jsonProjectedProp.name, "jsonProjectedName");
    strictEqual(jsonProjectedProp.kind, "property");
    strictEqual(jsonProjectedProp.serializationOptions.json?.name, "jsonProjectedName");

    // regular
    const regularProp = sdkModel.properties.find(
      (x) => x.kind === "property" && x.serializedName === "regular",
    );
    ok(regularProp);
    strictEqual(regularProp.name, "regular");
    strictEqual(regularProp.kind, "property");
    strictEqual(regularProp.serializationOptions.json?.name, "regular");
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
