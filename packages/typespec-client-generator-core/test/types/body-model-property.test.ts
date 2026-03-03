import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { isReadOnly } from "../../src/types.js";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";
import { getSdkModelPropertyTypeHelper } from "./utils.js";

it("required", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: string | int32;
    }
  `);
  const context = await createSdkContextForTester(program);
  const prop = getSdkModelPropertyTypeHelper(context);
  strictEqual(prop.optional, false);
  strictEqual(isReadOnly(prop), false);
});

it("optional", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name?: string;
    }
  `);

  const context = await createSdkContextForTester(program);
  const prop = getSdkModelPropertyTypeHelper(context);
  strictEqual(prop.optional, true);
});

it("readonly", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      @visibility(Lifecycle.Read)
      name?: string;
    }
  `);

  const context = await createSdkContextForTester(program);
  const prop = getSdkModelPropertyTypeHelper(context);
  strictEqual(isReadOnly(prop), true);
});

it("not readonly", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      @visibility(Lifecycle.Read, Lifecycle.Create, Lifecycle.Update)
      name?: string;
    }
  `);

  const context = await createSdkContextForTester(program);
  const prop = getSdkModelPropertyTypeHelper(context);
  strictEqual(isReadOnly(prop), false);
});

it("union type", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      name: string | int32;
    }
  `);

  const context = await createSdkContextForTester(program);
  const prop = getSdkModelPropertyTypeHelper(context);
  strictEqual(prop.kind, "property");
  const sdkType = prop.type;
  strictEqual(sdkType.kind, "union");
  const variants = sdkType.variantTypes;
  strictEqual(variants.length, 2);
  strictEqual(variants[0].kind, "string");
  strictEqual(variants[1].kind, "int32");
});

it("versioning", async function () {
  const { program } = await SimpleTester.compile(`
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
  const context = await createSdkContextForTester(program, {
    "api-version": "all",
  });
  const sdkModel = context.sdkPackage.models.find((x) => x.kind === "model");
  ok(sdkModel);
  strictEqual(sdkModel.kind, "model");

  const versionedProp = sdkModel.properties[0];
  deepStrictEqual(versionedProp.apiVersions, ["v1", "v3", "v4"]);

  const nonVersionedProp = sdkModel.properties[1];
  deepStrictEqual(nonVersionedProp.apiVersions, ["v1", "v2", "v3", "v4"]);

  const removedProp = sdkModel.properties[2];
  deepStrictEqual(removedProp.apiVersions, ["v1", "v2"]);
});
