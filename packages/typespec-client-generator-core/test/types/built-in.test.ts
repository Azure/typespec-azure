import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { SdkBuiltInType, SdkContext } from "../../src/interfaces.js";
import { getAllModels } from "../../src/types.js";
import {
  AzureCoreTesterWithService,
  createSdkContextForTester,
  SimpleTesterWithService,
} from "../tester.js";
import { getSdkTypeHelper } from "./utils.js";

function assertModelsAndEnumsHaveNames(context: SdkContext) {
  for (const modelsOrEnums of [context.sdkPackage.models, context.sdkPackage.enums]) {
    for (const item of modelsOrEnums) {
      ok(item.name !== "");
    }
  }
}

it("string", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      prop: string;
    }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "string");
  strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.string");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("boolean", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: boolean;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "boolean");
  strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.boolean");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
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
    const { program } = await SimpleTesterWithService.compile(
      `
        @usage(Usage.input | Usage.output)
        model Test {
          prop: ${type};
        }
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkType = getSdkTypeHelper(context) as SdkBuiltInType;
    strictEqual(sdkType.kind, type);
    strictEqual(sdkType?.crossLanguageDefinitionId, `TypeSpec.${type}`);
    strictEqual(sdkType?.baseType, undefined);
    assertModelsAndEnumsHaveNames(context);
  }
});

it("floats", async function () {
  const types = ["numeric", "float", "float32", "float64"];
  for (const type of types) {
    const { program } = await SimpleTesterWithService.compile(
      `
        @usage(Usage.input | Usage.output)
        model Test {
          prop: ${type};
        }
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkType = getSdkTypeHelper(context) as SdkBuiltInType;
    strictEqual(sdkType.kind, type);
    strictEqual(sdkType.crossLanguageDefinitionId, `TypeSpec.${type}`);
    strictEqual(sdkType.baseType, undefined);
    assertModelsAndEnumsHaveNames(context);
  }
});

it("decimal", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: decimal;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "decimal");
  strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.decimal");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("decimal128", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: decimal128;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "decimal128");
  strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.decimal128");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("unknown", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: unknown;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "unknown");
  assertModelsAndEnumsHaveNames(context);
});

it("null", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: null;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "unknown");
  assertModelsAndEnumsHaveNames(context);
});

it("bytes", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: bytes;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "bytes");
  strictEqual(sdkType.encode, "base64");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("bytes base64", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(BytesKnownEncoding.base64)
        prop: bytes;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "bytes");
  strictEqual(sdkType.encode, "base64");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("bytes base64url", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(BytesKnownEncoding.base64url)
        prop: bytes;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "bytes");
  strictEqual(sdkType.encode, "base64url");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("bytes base64url scalar", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @encode(BytesKnownEncoding.base64url)
      scalar Base64UrlBytes extends bytes;

      @usage(Usage.input | Usage.output)
      model Test {
        value: Base64UrlBytes[];
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "array");
  strictEqual(sdkType.valueType.kind, "bytes");
  strictEqual(sdkType.valueType.name, "Base64UrlBytes");
  strictEqual(sdkType.valueType.encode, "base64url");
  strictEqual(sdkType.valueType.crossLanguageDefinitionId, "TestService.Base64UrlBytes");
  strictEqual(sdkType.valueType.baseType?.kind, "bytes");
  strictEqual(sdkType.valueType.baseType.encode, "base64");
  strictEqual(sdkType.valueType.baseType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("armId from Core", async function () {
  const { program } = await AzureCoreTesterWithService.compile(
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
  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  const type = models[0].properties[0].type;
  strictEqual(type.kind, "string");
  strictEqual(type.name, "armResourceIdentifier");
  strictEqual(type.crossLanguageDefinitionId, "Azure.Core.armResourceIdentifier");
  strictEqual(type.baseType?.kind, "string");
  assertModelsAndEnumsHaveNames(context);
});

it("format should not alter typespec types", async function () {
  const { program } = await AzureCoreTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        urlScalar: url;

        @format("url")
        urlFormatProperty: string;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const model = context.sdkPackage.models[0];
  const urlScalarProperty = model.properties.find((x) => x.name === "urlScalar");
  const urlFormatProperty = model.properties.find((x) => x.name === "urlFormatProperty");
  ok(urlScalarProperty);
  ok(urlFormatProperty);
  strictEqual(urlScalarProperty.type.kind, "url");
  strictEqual(urlFormatProperty.type.kind, "string");
  assertModelsAndEnumsHaveNames(context);
});

it("etag from core", async () => {
  const { program } = await AzureCoreTesterWithService.compile(`
    @resource("users")
    @doc("Details about a user.")
    model User {
      @key
      @doc("The user's name.")
      @visibility(Lifecycle.Read)
      name: string;

      ...Azure.Core.EtagProperty;
    }

    @doc("Gets status.")
    op getStatus is GetResourceOperationStatus<User>;
    `);
  const context = await createSdkContextForTester(program);
  const userModel = context.sdkPackage.models.find((x) => x.kind === "model" && x.name === "User");
  ok(userModel);
  strictEqual(userModel.properties.length, 2);
  const etagProperty = userModel.properties.find((x) => x.name === "etag");
  ok(etagProperty);
  strictEqual(etagProperty.type.kind, "string");
  strictEqual(etagProperty.type.name, "eTag");
  strictEqual(etagProperty.type.encode, undefined);
  strictEqual(etagProperty.type.crossLanguageDefinitionId, "Azure.Core.eTag");
  strictEqual(etagProperty.type.baseType?.kind, "string");
  assertModelsAndEnumsHaveNames(context);
});

it("multiple layers of inheritance of scalars", async () => {
  const { program } = await SimpleTesterWithService.compile(
    `
      scalar Base extends string;
      scalar Derived extends Base;

      @usage(Usage.input | Usage.output)
      model Test {
        prop: Derived;
      }
      `,
  );
  const context = await createSdkContextForTester(program);
  const models = getAllModels(context);
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
  assertModelsAndEnumsHaveNames(context);
});

it("with doc", async () => {
  const { program } = await SimpleTesterWithService.compile(
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
  const context = await createSdkContextForTester(program);
  const models = getAllModels(context);
  strictEqual(models[0].kind, "model");
  const type = models[0].properties[0].type;
  strictEqual(type.kind, "string");
  strictEqual(type.name, "TestScalar");
  strictEqual(type.doc, "doc");
  strictEqual(type.summary, "title");
  strictEqual(type.crossLanguageDefinitionId, "TestService.TestScalar");
  assertModelsAndEnumsHaveNames(context);
});

it("integer model property encoded as string", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(string)
        value: safeint;
      }
      `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "safeint");
  strictEqual(sdkType.encode, "string");
  strictEqual(sdkType.baseType, undefined);
  assertModelsAndEnumsHaveNames(context);
});

it("integer scalar encoded as string", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @encode(string)
      scalar int32EncodedAsString extends int32;

      @usage(Usage.input | Usage.output)
      model Test {
        value: int32EncodedAsString;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "int32");
  strictEqual(sdkType.encode, "string");
  strictEqual(sdkType.baseType?.kind, "int32");
  assertModelsAndEnumsHaveNames(context);
});
