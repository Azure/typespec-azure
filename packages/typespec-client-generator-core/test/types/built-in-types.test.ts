import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkBuiltInType } from "../../src/interfaces.js";
import { getAllModels } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: built-in types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("string", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: string;
      }
      `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "string");
    strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.string");
    strictEqual(sdkType.baseType, undefined);
  });

  it("boolean", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: boolean;
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "boolean");
    strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.boolean");
    strictEqual(sdkType.baseType, undefined);
  });

  it("integers", async function () {
    const types = [
      "int8",
      "int16",
      "int32",
      "int64",
      "uint8",
      "uint16",
      "uint32",
      "uint64",
      "integer",
    ];
    for (const type of types) {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        model Test {
          prop: ${type};
        }
      `,
      );
      const sdkType = getSdkTypeHelper(runner) as SdkBuiltInType;
      strictEqual(sdkType.kind, type);
      strictEqual(sdkType?.crossLanguageDefinitionId, `TypeSpec.${type}`);
      strictEqual(sdkType?.baseType, undefined);
    }
  });

  it("floats", async function () {
    const types = ["numeric", "float", "float32", "float64"];
    for (const type of types) {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        model Test {
          prop: ${type};
        }
      `,
      );
      const sdkType = getSdkTypeHelper(runner) as SdkBuiltInType;
      strictEqual(sdkType.kind, type);
      strictEqual(sdkType.crossLanguageDefinitionId, `TypeSpec.${type}`);
      strictEqual(sdkType.baseType, undefined);
    }
  });

  it("decimal", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: decimal;
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "decimal");
    strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.decimal");
    strictEqual(sdkType.baseType, undefined);
  });

  it("decimal128", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: decimal128;
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "decimal128");
    strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.decimal128");
    strictEqual(sdkType.baseType, undefined);
  });

  it("unknown", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: unknown;
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "any");
  });

  it("bytes", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: bytes;
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "bytes");
    strictEqual(sdkType.encode, "base64");
    strictEqual(sdkType.baseType, undefined);
  });

  it("bytes base64", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(BytesKnownEncoding.base64)
        prop: bytes;
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "bytes");
    strictEqual(sdkType.encode, "base64");
    strictEqual(sdkType.baseType, undefined);
  });

  it("bytes base64url", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(BytesKnownEncoding.base64url)
        prop: bytes;
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "bytes");
    strictEqual(sdkType.encode, "base64url");
    strictEqual(sdkType.baseType, undefined);
  });

  it("bytes base64url scalar", async function () {
    await runner.compileWithBuiltInService(
      `
      @encode(BytesKnownEncoding.base64url)
      scalar Base64UrlBytes extends bytes;

      @usage(Usage.input | Usage.output)
      model Test {
        value: Base64UrlBytes[];
      }
    `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    strictEqual(sdkType.valueType.kind, "bytes");
    strictEqual(sdkType.valueType.name, "Base64UrlBytes");
    strictEqual(sdkType.valueType.encode, "base64url");
    strictEqual(sdkType.valueType.crossLanguageDefinitionId, "TestService.Base64UrlBytes");
    strictEqual(sdkType.valueType.baseType?.kind, "bytes");
    strictEqual(sdkType.valueType.baseType.encode, "base64");
    strictEqual(sdkType.valueType.baseType.baseType, undefined);
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
      model Test {
        id: Azure.Core.armResourceIdentifier<[
          {
            type: "Microsoft.Test/test";
          }
        ]>;
      }
    `,
    );
    const models = runnerWithCore.context.sdkPackage.models;
    const type = models[0].properties[0].type;
    strictEqual(type.kind, "string");
    strictEqual(type.name, "armResourceIdentifier");
    strictEqual(type.crossLanguageDefinitionId, "Azure.Core.armResourceIdentifier");
    strictEqual(type.baseType?.kind, "string");
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
      model Test {
        urlScalar: url;

        @format("url")
        urlProperty: string;
      }
    `,
    );
    const models = runnerWithCore.context.sdkPackage.models;
    for (const property of models[0].properties) {
      strictEqual(property.kind, "property");
      strictEqual(
        property.type.kind,
        property.serializedName.replace("Scalar", "").replace("Property", ""),
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
      (x) => x.kind === "model" && x.name === "User",
    );
    ok(userModel);
    strictEqual(userModel.properties.length, 2);
    const etagProperty = userModel.properties.find((x) => x.name === "etag");
    ok(etagProperty);
    strictEqual(etagProperty.type.kind, "string");
    strictEqual(etagProperty.type.name, "eTag");
    strictEqual(etagProperty.type.encode, "string");
    strictEqual(etagProperty.type.crossLanguageDefinitionId, "Azure.Core.eTag");
    strictEqual(etagProperty.type.baseType?.kind, "string");
  });

  it("multiple layers of inheritance of scalars", async () => {
    await runner.compileWithBuiltInService(
      `
      scalar Base extends string;
      scalar Derived extends Base;

      @usage(Usage.input | Usage.output)
      model Test {
        prop: Derived;
      }
      `,
    );
    const models = getAllModels(runner.context);
    strictEqual(models[0].kind, "model");
    const type = models[0].properties[0].type;
    strictEqual(type.kind, "string");
    strictEqual(type.name, "Derived");
    strictEqual(type.crossLanguageDefinitionId, "TestService.Derived");
    strictEqual(type.baseType?.kind, "string");
    strictEqual(type.baseType?.name, "Base");
    strictEqual(type.baseType?.crossLanguageDefinitionId, "TestService.Base");
    strictEqual(type.baseType?.baseType?.kind, "string");
    strictEqual(type.baseType.baseType.name, "string");
    strictEqual(type.baseType.baseType.crossLanguageDefinitionId, "TypeSpec.string");
    strictEqual(type.baseType.baseType.baseType, undefined);
  });

  it("unknown format", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        @format("unknown")
        unknownProp: string;
      }
    `,
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
    `,
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
      model Test {
        prop: TestScalar;
      }
    `,
    );
    const models = getAllModels(runner.context);
    strictEqual(models[0].kind, "model");
    const type = models[0].properties[0].type;
    strictEqual(type.kind, "string");
    strictEqual(type.name, "TestScalar");
    strictEqual(type.description, "title");
    strictEqual(type.details, "doc");
    strictEqual(type.doc, "doc");
    strictEqual(type.summary, "title");
    strictEqual(type.crossLanguageDefinitionId, "TestService.TestScalar");
  });

  it("integer model property encoded as string", async function () {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(string)
        value: safeint;
      }
      `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "safeint");
    strictEqual(sdkType.encode, "string");
    strictEqual(sdkType.baseType, undefined);
  });

  it("integer scalar encoded as string", async function () {
    await runner.compileWithBuiltInService(
      `
      @encode(string)
      scalar int32EncodedAsString extends int32;

      @usage(Usage.input | Usage.output)
      model Test {
        value: int32EncodedAsString;
      }
      `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "int32");
    strictEqual(sdkType.encode, "string");
    strictEqual(sdkType.baseType?.kind, "int32");
  });
});
