/* eslint-disable deprecation/deprecation */
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getAllModels } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: built-in types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("decimal", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: decimal;
      }
    `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "decimal");
  });

  it("decimal128", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: decimal128;
      }
    `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "decimal128");
  });

  it("unknown", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: unknown;
      }
    `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "any");
  });

  it("bytes", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: bytes;
      }
    `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "bytes");
    strictEqual(sdkType.encode, "base64");
  });

  it("bytes base64", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        @encode(BytesKnownEncoding.base64)
        prop: bytes;
      }
    `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "bytes");
    strictEqual(sdkType.encode, "base64");
  });

  it("bytes base64url", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        @encode(BytesKnownEncoding.base64url)
        prop: bytes;
      }
    `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "bytes");
    strictEqual(sdkType.encode, "base64url");
  });

  it("bytes base64url scalar", async function () {
    await runner.compileWithBuiltInService(
      `
      @encode(BytesKnownEncoding.base64url)
      scalar Base64UrlBytes extends bytes;

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        value: Base64UrlBytes[];
      }
    `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    strictEqual(sdkType.valueType.kind, "bytes");
    strictEqual(sdkType.valueType.name, "Base64UrlBytes");
    strictEqual(sdkType.valueType.encode, "base64url");
    strictEqual(sdkType.valueType.crossLanguageDefinitionId, "TestService.Base64UrlBytes");
    strictEqual(sdkType.valueType.baseType?.kind, "bytes");
    strictEqual(sdkType.valueType.baseType.encode, "base64");
  });

  it("armId from Core", async function () {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compileWithBuiltInAzureCoreService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        id: Azure.Core.armResourceIdentifier<[
          {
            type: "Microsoft.Test/test";
          }
        ]>;
      }
    `
    );
    const models = runnerWithCore.context.sdkPackage.models;
    const type = models[0].properties[0].type;
    strictEqual(type.kind, "string");
    strictEqual(type.name, "armResourceIdentifier");
    strictEqual(type.crossLanguageDefinitionId, "Azure.Core.armResourceIdentifier");
  });

  it("format", async function () {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compileWithBuiltInAzureCoreService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        urlScalar: url;

        @format("url")
        urlProperty: string;
      }
    `
    );
    const models = runnerWithCore.context.sdkPackage.models;
    for (const property of models[0].properties) {
      strictEqual(property.kind, "property");
      strictEqual(
        property.type.kind,
        property.serializedName.replace("Scalar", "").replace("Property", "")
      );
    }
  });

  it("etag from core", async () => {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      "filter-out-core-models": false,
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compileWithBuiltInAzureCoreService(`
    @resource("users")
    @doc("Details about a user.")
    model User {
      @key
      @doc("The user's name.")
      @visibility("read")
      name: string;

      ...Azure.Core.EtagProperty;
    }

    @doc("Gets status.")
    op getStatus is GetResourceOperationStatus<User>;
    `);
    const userModel = runnerWithCore.context.sdkPackage.models.find(
      (x) => x.kind === "model" && x.name === "User"
    );
    ok(userModel);
    strictEqual(userModel.properties.length, 2);
    const etagProperty = userModel.properties.find((x) => x.name === "etag");
    ok(etagProperty);
    strictEqual(etagProperty.type.kind, "string");
    strictEqual(etagProperty.type.name, "eTag");
    strictEqual(etagProperty.type.encode, "string");
    strictEqual(etagProperty.type.crossLanguageDefinitionId, "Azure.Core.eTag");
  });

  it("unknown format", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        @format("unknown")
        unknownProp: string;
      }
    `
    );
    const models = getAllModels(runner.context);
    strictEqual(models[0].kind, "model");
    strictEqual(models[0].properties[0].type.kind, "string");
  });

  it("known values", async function () {
    await runner.compileWithBuiltInService(
      `
      enum TestEnum{
        one,
        two,
        three,
      }

      #suppress "deprecated" "for testing"
      @knownValues(TestEnum)
      scalar testScalar extends string;

      model TestModel {
        prop1: testScalar;
        #suppress "deprecated" "for testing"
        @knownValues(TestEnum)
        prop2: string;
      }

      op func(
        @body body: TestModel
      ): void;
    `
    );
    expectDiagnostics(runner.context.diagnostics, []);
    const m = runner.context.sdkPackage.models.find((x) => x.name === "TestModel");
    const e1 = runner.context.sdkPackage.enums.find((x) => x.name === "TestEnum");
    const e2 = runner.context.sdkPackage.enums.find((x) => x.name === "testScalar");
    ok(m && e1 && e2);
    strictEqual(e1.kind, "enum");
    strictEqual(e1.isUnionAsEnum, false);
    strictEqual(e1.valueType.kind, "string");
    strictEqual(e2.kind, "enum");
    strictEqual(e2.isUnionAsEnum, false);
    strictEqual(e2.valueType.kind, "string");
    for (const property of m.properties) {
      if (property.name === "prop1") {
        strictEqual(property.type, e2);
      } else if (property.name === "prop2") {
        strictEqual(property.type, e1);
      }
    }
  });
  it("with doc", async () => {
    await runner.compileWithBuiltInService(
      `
      @doc("doc")
      @summary("title")
      scalar TestScalar extends string;
      
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: TestScalar;
      }
    `
    );
    const models = getAllModels(runner.context);
    strictEqual(models[0].kind, "model");
    const type = models[0].properties[0].type;
    strictEqual(type.kind, "string");
    strictEqual(type.name, "TestScalar");
    strictEqual(type.description, "title");
    strictEqual(type.details, "doc");
    strictEqual(type.crossLanguageDefinitionId, "TestService.TestScalar");
  });
});
