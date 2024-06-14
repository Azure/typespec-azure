import { strictEqual, ok, deepStrictEqual } from "assert";
import { describe, beforeEach, it } from "vitest";
import { isReadOnly } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkBodyModelPropertyTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  describe("SdkBodyModelPropertyType", () => {
    it("required", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
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
        @access(Access.public)
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
        @access(Access.public)
        model Test {
          @visibility("read")
          name?: string;
        }
      `);

      const prop = getSdkBodyModelPropertyTypeHelper(runner);
      strictEqual(isReadOnly(prop), true);
    });
    it("not readonly", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @visibility("read", "create", "update")
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
        @usage(Usage.input | Usage.output)
        @access(Access.public)
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
      `);

      const sdkModel = runner.context.experimental_sdkPackage.models[0];
      strictEqual(sdkModel.name, "JavaTest");

      // Java projected name test
      const javaProjectedProp = sdkModel.properties.find((x) => x.name === "javaProjectedName");
      ok(javaProjectedProp);
      strictEqual(javaProjectedProp.kind, "property");
      strictEqual(javaProjectedProp.serializedName, "javaWireName");

      // client projected name test

      const clientProjectedProp = sdkModel.properties.find((x) => x.name === "clientName");
      ok(clientProjectedProp);
      strictEqual(clientProjectedProp.kind, "property");
      strictEqual(clientProjectedProp.serializedName, "clientProjectedName");

      // wire name test with encoded and projected
      const jsonEncodedProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "encodedWireName"
      );
      ok(jsonEncodedProp);
      strictEqual(jsonEncodedProp.nameInClient, "jsonEncodedAndProjectedName");
      strictEqual(jsonEncodedProp.name, "jsonEncodedAndProjectedName");

      // wire name test with deprecated projected
      const jsonProjectedProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "realWireName"
      );
      ok(jsonProjectedProp);
      strictEqual(jsonProjectedProp.nameInClient, "jsonProjectedName");
      strictEqual(jsonProjectedProp.name, "jsonProjectedName");

      // regular
      const regularProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "regular"
      );
      ok(regularProp);
      strictEqual(regularProp.nameInClient, "regular");
      strictEqual(regularProp.name, "regular");
    });
    it("union type", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: string | int32;
        }
      `);

      const prop = getSdkBodyModelPropertyTypeHelper(runner);
      strictEqual(prop.kind, "property");
      const sdkType = prop.type;
      strictEqual(sdkType.kind, "union");
      const values = sdkType.values;
      strictEqual(values.length, 2);
      strictEqual(values[0].kind, "string");
      strictEqual(values[1].kind, "int32");
    });
    it("versioning", async function () {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "all",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
        @versioned(Versions)
        @service({title: "Widget Service"})
        namespace DemoService;

        enum Versions {
          v1,
          v2,
          v3,
          v4,
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
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
      const sdkModel = runnerWithVersion.context.experimental_sdkPackage.models.find(
        (x) => x.kind === "model"
      );
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
});
