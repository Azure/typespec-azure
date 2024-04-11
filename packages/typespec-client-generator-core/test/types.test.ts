import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Enum, Model, Union } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepEqual, deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkArrayType,
  SdkBodyModelPropertyType,
  SdkEnumType,
  SdkModelType,
  SdkType,
  SdkUnionType,
  UsageFlags,
} from "../src/interfaces.js";
import { isErrorOrChildOfError } from "../src/public-utils.js";
import {
  getAllModels,
  getAllModelsWithDiagnostics,
  getClientType,
  getSdkEnum,
  isReadOnly,
} from "../src/types.js";
import { SdkTestRunner, createSdkTestRunner, createTcgcTestRunnerForEmitter } from "./test-host.js";

describe("typespec-client-generator-core: types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  describe("SdkBuiltInType", () => {
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
        scalar Base64rulBytes extends bytes;

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          value: Base64rulBytes[];
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "array");
      strictEqual(sdkType.valueType.kind, "bytes");
      strictEqual(sdkType.valueType.encode, "base64url");
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
          uuidScalar: uuid;
          eTagScalar: eTag;

          @format("url")
          urlProperty: string;
          @format("uuid")
          uuidProperty: string;
          @format("eTag")
          eTagProperty: string;
        }
      `
      );
      const models = runnerWithCore.context.experimental_sdkPackage.models;
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
      const userModel = runnerWithCore.context.experimental_sdkPackage.models.find(
        (x) => x.kind === "model" && x.name === "User"
      );
      ok(userModel);
      strictEqual(userModel.properties.length, 2);
      const etagProperty = userModel.properties.find((x) => x.name === "etag");
      ok(etagProperty);
      strictEqual(etagProperty.type.kind, "eTag");
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
      // eslint-disable-next-line deprecation/deprecation
      expectDiagnostics(runner.context.experimental_sdkPackage.diagnostics, []);
      expectDiagnostics(runner.context.diagnostics, []);
      const m = runner.context.experimental_sdkPackage.models.find((x) => x.name === "TestModel");
      const e1 = runner.context.experimental_sdkPackage.enums.find((x) => x.name === "TestEnum");
      const e2 = runner.context.experimental_sdkPackage.enums.find((x) => x.name === "testScalar");
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
      strictEqual(models[0].properties[0].type.description, "title");
      strictEqual(models[0].properties[0].type.details, "doc");
    });
  });
  describe("SdkDurationType", () => {
    it("default", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          prop: duration;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "duration");
      strictEqual(sdkType.wireType.kind, "string");
      strictEqual(sdkType.encode, "ISO8601");
    });
    it("iso8601", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.ISO8601)
          prop: duration;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "duration");
      strictEqual(sdkType.wireType.kind, "string");
      strictEqual(sdkType.encode, "ISO8601");
    });
    it("int32 seconds", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.seconds, int32)
          prop: duration;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "duration");
      strictEqual(sdkType.wireType.kind, "int32");
      strictEqual(sdkType.encode, "seconds");
    });

    it("float seconds", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.seconds, float)
          prop: duration;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "duration");
      strictEqual(sdkType.wireType.kind, "float");
      strictEqual(sdkType.encode, "seconds");
    });

    it("nullable float seconds", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.seconds, float)
          prop: duration | null;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "duration");
      strictEqual(sdkType.wireType.kind, "float");
      strictEqual(sdkType.encode, "seconds");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(sdkType.nullable, true);
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(sdkType.wireType.nullable, true);
      const nameProp = runner.context.experimental_sdkPackage.models[0].properties[0];
      strictEqual(nameProp.nullable, true);
    });

    it("float seconds decorated scalar", async function () {
      await runner.compileWithBuiltInService(
        `
        @doc("doc")
        @summary("title")
        @encode(DurationKnownEncoding.seconds, float32)
        scalar Float32Duration extends duration;
        
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          value: Float32Duration[];
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "array");
      strictEqual(sdkType.valueType.kind, "duration");
      strictEqual(sdkType.valueType.wireType.kind, "float32");
      strictEqual(sdkType.valueType.encode, "seconds");
      strictEqual(sdkType.valueType.description, "title");
      strictEqual(sdkType.valueType.details, "doc");
    });
  });

  describe("SdkDatetimeType", () => {
    it("default", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          prop: utcDateTime;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "utcDateTime");
      strictEqual(sdkType.wireType.kind, "string");
      strictEqual(sdkType.encode, "rfc3339");
    });
    it("rfc3339", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.rfc3339)
          prop: utcDateTime;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "utcDateTime");
      strictEqual(sdkType.wireType.kind, "string");
      strictEqual(sdkType.encode, "rfc3339");
    });
    it("rfc7231", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.rfc7231)
          prop: utcDateTime;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "utcDateTime");
      strictEqual(sdkType.wireType.kind, "string");
      strictEqual(sdkType.encode, "rfc7231");
    });

    it("unixTimestamp", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.unixTimestamp, int64)
          value: utcDateTime;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "utcDateTime");
      strictEqual(sdkType.wireType.kind, "int64");
      strictEqual(sdkType.encode, "unixTimestamp");
    });

    it("nullable unixTimestamp", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.unixTimestamp, int64)
          value: utcDateTime | null;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "utcDateTime");
      strictEqual(sdkType.wireType.kind, "int64");
      strictEqual(sdkType.encode, "unixTimestamp");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(sdkType.nullable, true);
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(sdkType.wireType.nullable, true);
      const nameProp = runner.context.experimental_sdkPackage.models[0].properties[0];
      strictEqual(nameProp.nullable, true);
    });

    it("unixTimestamp array", async function () {
      await runner.compileWithBuiltInService(
        `
        @doc("doc")
        @summary("title")
        @encode(DateTimeKnownEncoding.unixTimestamp, int64)
        scalar unixTimestampDatetime extends utcDateTime;

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          value: unixTimestampDatetime[];
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "array");
      strictEqual(sdkType.valueType.kind, "utcDateTime");
      strictEqual(sdkType.valueType.wireType.kind, "int64");
      strictEqual(sdkType.valueType.encode, "unixTimestamp");
      strictEqual(sdkType.valueType.description, "title");
      strictEqual(sdkType.valueType.details, "doc");
    });
  });
  describe("SdkUnionType", () => {
    it("primitive union", async function () {
      await runner.compileWithBuiltInService(
        `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: string | int32;
        }
      `
      );
      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "union");
      strictEqual(sdkType.name, "TestName");
      ok(sdkType.isGeneratedName);
      const values = sdkType.values;
      strictEqual(values.length, 2);
      strictEqual(values[0].kind, "string");
      strictEqual(values[1].kind, "int32");
    });
    it("nullable", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: float32 | null;
        }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "float32");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(sdkType.nullable, true);
      const nameProp = runner.context.experimental_sdkPackage.models[0].properties[0];
      strictEqual(nameProp.nullable, true);
    });

    it("record with nullable", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: Record<float32 | null>;
        }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "dict");
      const elementType = sdkType.valueType;
      strictEqual(elementType.kind, "float32");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(elementType.nullable, true);
      const nameProp = runner.context.experimental_sdkPackage.models[0].properties[0];
      strictEqual(nameProp.nullable, false);
      strictEqual(sdkType.nullableValues, true);
    });

    it("array with nullable", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: (float32 | null)[];
        }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "array");
      const elementType = sdkType.valueType;
      strictEqual(elementType.kind, "float32");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(elementType.nullable, true);
      const nameProp = runner.context.experimental_sdkPackage.models[0].properties[0];
      strictEqual(nameProp.nullable, false);
      strictEqual(sdkType.nullableValues, true);
    });

    it("additional property is nullable", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model TestExtends extends Record<string|null> {
          name: string;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model TestIs is Record<string|null> {
          name: string;
        }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const extendsType = models.find((x) => x.name === "TestExtends");
      ok(extendsType);
      strictEqual(extendsType.kind, "model");
      strictEqual(extendsType.additionalProperties?.kind, "string");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(extendsType.additionalProperties?.nullable, true);
      strictEqual(extendsType.additionalPropertiesNullable, true);

      const isType = models.find((x) => x.name === "TestIs");
      ok(isType);
      strictEqual(isType.kind, "model");
      strictEqual(isType.additionalProperties?.kind, "string");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(isType.additionalProperties?.nullable, true);
      strictEqual(isType.additionalPropertiesNullable, true);
    });

    it("model with simple union property", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
        @access(Access.public)
      model ModelWithSimpleUnionProperty {
        prop: int32 | int32[];
      }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "union");
      const values = sdkType.values;
      strictEqual(values.length, 2);
      strictEqual(values[0].kind, "int32");
      strictEqual(values[1].kind, "array");

      const elementType = (<SdkArrayType>values[1]).valueType;
      strictEqual(elementType.kind, "int32");
    });

    it("model with named union", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model BaseModel {
        name: string;
      }
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Model1 extends BaseModel {
        prop1: int32;
      }
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Model2 extends BaseModel {
        prop2: int32;
      }
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union MyNamedUnion {
        one: Model1,
        two: Model2,
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model ModelWithNamedUnionProperty {
        prop: MyNamedUnion;
      }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 4);
      const modelWithNamedUnionProperty = models.find(
        (x) => x.kind === "model" && x.name === "ModelWithNamedUnionProperty"
      );
      ok(modelWithNamedUnionProperty);
      const property = modelWithNamedUnionProperty.properties[0];
      strictEqual(property.kind, "property");
      const sdkType = property.type;
      strictEqual(sdkType.kind, "union");
      const values = sdkType.values;
      strictEqual(values.length, 2);
      strictEqual(values[0].kind, "model");
      strictEqual(values[0].name, "Model1");
      strictEqual(
        values[0],
        models.find((x) => x.kind === "model" && x.name === "Model1")
      );
      strictEqual(values[1].kind, "model");
      strictEqual(values[1].name, "Model2");
      strictEqual(
        values[1],
        models.find((x) => x.kind === "model" && x.name === "Model2")
      );
      1;
    });

    it("model with nullable enum property", async function () {
      await runner.compileWithBuiltInService(`
      enum PetKind {
        dog, cat, bird
      }
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Home {
        pet: PetKind | null;
      }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "enum");
      strictEqual(sdkType.isUnionAsEnum, false);
      strictEqual(sdkType.name, "PetKind");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(sdkType.nullable, true);
      const pet = runner.context.experimental_sdkPackage.models[0].properties[0];
      strictEqual(pet.nullable, true);
      const values = sdkType.values;
      strictEqual(values.length, 3);
    });

    it("model with nullable model property", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model PropertyModel {
        internalProp: string;
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: PropertyModel | null;
      }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const model = models.find((x) => x.kind === "model" && x.name === "Test");
      ok(model);
      const sdkType = model.properties[0].type;
      strictEqual(sdkType.kind, "model");
      strictEqual(sdkType.name, "PropertyModel");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(sdkType.nullable, true);
      strictEqual(model.properties[0].nullable, true);
    });

    it("mix types", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model ModelType {
        name: string;
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: "none" | "auto" | ModelType;
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model TestNullable {
        prop: "none" | "auto" | ModelType | null;
      }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
      const model = models.find((x) => x.kind === "model" && x.name === "Test");
      ok(model);
      const nullableModel = models.find((x) => x.kind === "model" && x.name === "TestNullable");
      ok(nullableModel);
      strictEqual(model.properties[0].type.kind, "union");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(model.properties[0].type.nullable, false);
      strictEqual(model.properties[0].nullable, false);
      const unionType = model.properties[0].type;
      strictEqual(unionType.kind, "union");
      for (const v of unionType.values) {
        if (v.kind === "model") {
          strictEqual(v.name, "ModelType");
        } else {
          strictEqual(v.kind, "constant");
        }
      }
      strictEqual(nullableModel.properties[0].type.kind, "union");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(nullableModel.properties[0].type.nullable, true);
      strictEqual(nullableModel.properties[0].nullable, true);
      for (const v of nullableModel.properties[0].type.values) {
        if (v.kind === "model") {
          strictEqual(v.name, "ModelType");
        } else {
          strictEqual(v.kind, "constant");
        }
      }
    });

    it("usage", async function () {
      await runner.compileWithBuiltInService(`
      union UnionAsEnum {
        "A",
        "B",
        string,
      }

      model Foo {
        prop: string;
      }

      union NullableUnion {
        Foo,
        null
      }

      model Bar {
        prop1: UnionAsEnum;
        prop2: NullableUnion;
      }

      @access(Access.internal)
      op func(
        @body body: Bar
      ): void;
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const foo = models.find((x) => x.name === "Foo");
      ok(foo);
      strictEqual(foo.usage, UsageFlags.Input);
      strictEqual(foo.access, "internal");
      const enums = runner.context.experimental_sdkPackage.enums;
      strictEqual(enums.length, 1);
      const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
      ok(unionAsEnum);
      strictEqual(unionAsEnum.usage, UsageFlags.Input);
      strictEqual(unionAsEnum.access, "internal");
    });

    it("usage override", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union UnionAsEnum {
        "A",
        "B",
        string,
      }

      model Foo {
        prop: string;
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union NullableUnion {
        Foo,
        null
      }

      model Bar {
        prop1: UnionAsEnum;
        prop2: NullableUnion;
      }

      @access(Access.internal)
      op func(
        @body body: Bar
      ): void;
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const foo = models.find((x) => x.name === "Foo");
      ok(foo);
      strictEqual(foo.usage, UsageFlags.Input | UsageFlags.Output);
      strictEqual(foo.access, "public");
      const enums = runner.context.experimental_sdkPackage.enums;
      strictEqual(enums.length, 1);
      const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
      ok(unionAsEnum);
      strictEqual(unionAsEnum.usage, UsageFlags.Input | UsageFlags.Output);
      strictEqual(unionAsEnum.access, "public");
    });

    it("usage override for orphan union as enum", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union UnionAsEnum {
        "A",
        "B",
        string,
      }

      @usage(Usage.input | Usage.output)
      @access(Access.internal)
      union UnionAsEnumInternal {
        "A",
        "B",
        string,
      }
      `);

      const enums = runner.context.experimental_sdkPackage.enums;
      strictEqual(enums.length, 2);
      const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
      ok(unionAsEnum);
      strictEqual(unionAsEnum.usage, UsageFlags.Input | UsageFlags.Output);
      strictEqual(unionAsEnum.access, "public");
      const unionAsEnumInternal = enums.find((x) => x.name === "UnionAsEnumInternal");
      ok(unionAsEnumInternal);
      strictEqual(unionAsEnumInternal.usage, UsageFlags.Input | UsageFlags.Output);
      strictEqual(unionAsEnumInternal.access, "internal");
    });
  });
  describe("SdkEnumType", () => {
    it("string extensible", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      enum DaysOfWeekExtensibleEnum {
          Monday,
          Tuesday,
          Wednesday,
          Thursday,
          Friday,
          Saturday,
          Sunday,
        }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: DaysOfWeekExtensibleEnum
      }
      `);

      strictEqual(runner.context.experimental_sdkPackage.models.length, 1);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const sdkType = runner.context.experimental_sdkPackage.enums[0];
      strictEqual(sdkType.isFixed, true);
      strictEqual(sdkType.name, "DaysOfWeekExtensibleEnum");
      strictEqual(sdkType.valueType.kind, "string");
      strictEqual(sdkType.usage & UsageFlags.ApiVersionEnum, 0); // not a versioning enum
      strictEqual(sdkType.isUnionAsEnum, false);
      const values = sdkType.values;
      strictEqual(values.length, 7);
      const nameList = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      deepEqual(
        values.map((x) => x.name),
        nameList
      );
      deepEqual(
        values.map((x) => x.value),
        nameList
      );
      for (const value of sdkType.values) {
        deepStrictEqual(value.enumType, sdkType);
        deepStrictEqual(value.valueType, sdkType.valueType);
      }
    });

    it("int extensible", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      enum Integers {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: Integers
      }
      `);

      strictEqual(runner.context.experimental_sdkPackage.models.length, 1);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const sdkType = runner.context.experimental_sdkPackage.enums[0];
      strictEqual(sdkType.isFixed, true);
      strictEqual(sdkType.name, "Integers");
      strictEqual(sdkType.valueType.kind, "int32");
      const values = sdkType.values;
      strictEqual(values.length, 5);
      deepEqual(
        values.map((x) => x.name),
        ["one", "two", "three", "four", "five"]
      );
      deepEqual(
        values.map((x) => x.value),
        [1, 2, 3, 4, 5]
      );
    });

    it("float extensible", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      enum Floats {
        a: 1,
        b: 2.1,
        c: 3,
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: Floats
      }
      `);

      const sdkType = runner.context.experimental_sdkPackage.enums[0];
      ok(sdkType);
      strictEqual(sdkType.isFixed, true);
      strictEqual(sdkType.name, "Floats");
      strictEqual(sdkType.valueType.kind, "float32");
      const values = sdkType.values;
      strictEqual(values.length, 3);
      deepEqual(
        values.map((x) => x.name),
        ["a", "b", "c"]
      );
      deepEqual(
        values.map((x) => x.value),
        [1, 2.1, 3]
      );
    });

    it("union as enum float type", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union Floats {
        float,
        a: 1,
        b: 2,
        c: 3,
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: Floats
      }
      `);

      const sdkType = runner.context.experimental_sdkPackage.enums[0];
      strictEqual(sdkType.isFixed, false);
      strictEqual(sdkType.name, "Floats");
      strictEqual(sdkType.valueType.kind, "float");
      const values = sdkType.values;
      strictEqual(values.length, 3);
      deepEqual(
        values.map((x) => x.name),
        ["a", "b", "c"]
      );
      deepEqual(
        values.map((x) => x.value),
        [1, 2, 3]
      );
    });

    it("union of union as enum float type", async function () {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union BaseEnum {
        int32,
        a: 1,
      }
      
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      union ExtendedEnum {
        BaseEnum,
        b: 2,
        c: 3,
      }

      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: ExtendedEnum
      }
      `);
      const sdkType = runner.context.experimental_sdkPackage.enums[0];
      ok(sdkType);
      strictEqual(sdkType.isFixed, false);
      strictEqual(sdkType.valueType.kind, "int32");
      const values = sdkType.values;
      strictEqual(values.length, 3);

      // since these union is named, it gets flattened into one
      ok(values.find((x) => x.name === "a" && x.value === 1));
      ok(values.find((x) => x.name === "b" && x.value === 2));
      ok(values.find((x) => x.name === "c" && x.value === 3));
    });

    it("string fixed", async function () {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithBuiltInAzureCoreService(`
      #suppress "@azure-tools/typespec-azure-core/use-extensible-enum" "For testing"
      @doc(".")
      @fixed
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      enum DaysOfWeekFixedEnum {
        @doc("Monday") Monday,
        @doc("Tuesday") Tuesday,
        @doc("Wednesday") Wednesday,
        @doc("Thursday") Thursday,
        @doc("Friday") Friday,
        @doc("Saturday") Saturday,
        @doc("Sunday") Sunday,
      }

      @doc(".")
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        @doc(".")
        prop: DaysOfWeekFixedEnum
      }
      `);
      strictEqual(runnerWithCore.context.experimental_sdkPackage.models.length, 1);
      strictEqual(runnerWithCore.context.experimental_sdkPackage.enums.length, 1);
      const sdkType = runnerWithCore.context.experimental_sdkPackage.enums[0];
      strictEqual(sdkType.isFixed, true);
      strictEqual(sdkType.name, "DaysOfWeekFixedEnum");
      strictEqual(sdkType.valueType.kind, "string");
      const values = sdkType.values;
      strictEqual(values.length, 7);
      const nameList = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      deepEqual(
        values.map((x) => x.name),
        nameList
      );
      deepEqual(
        values.map((x) => x.value),
        nameList
      );
      for (const value of sdkType.values) {
        deepStrictEqual(value.enumType, sdkType);
        deepStrictEqual(value.valueType, sdkType.valueType);
      }
    });
    it("enum access transitive closure", async () => {
      await runner.compileWithBuiltInService(`
        enum Integers {
          one: 1,
          two: 2,
          three: 3,
          four: 4,
          five: 5,
        }
        @access(Access.internal)
        op func(
          @body body: Integers
        ): void;
      `);

      strictEqual(runner.context.experimental_sdkPackage.enums[0].access, "internal");
    });
    it("crossLanguageDefinitionId", async () => {
      await runner.compile(`
        @service({})
        namespace MyService {
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          enum Integers {
            one: 1,
            two: 2,
            three: 3,
            four: 4,
            five: 5,
          }

          @usage(Usage.input | Usage.output)
          @access(Access.public)
          model Test {
            prop: Integers
          }
        }
      `);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const integersEnum = runner.context.experimental_sdkPackage.enums[0];
      strictEqual(integersEnum.crossLanguageDefinitionId, "MyService.Integers");
    });

    it("enum with deprecated annotation", async () => {
      await runner.compileAndDiagnose(`
        @service({})
        namespace MyService;
        #deprecated "no longer support"
        enum Test {
          test
        }
        op func(
          @body body: Test
        ): void;
      `);

      strictEqual(runner.context.experimental_sdkPackage.enums[0].deprecation, "no longer support");
    });

    it("orphan enum", async () => {
      await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          enum Enum1{
            one,
            two,
            three
          }

          enum Enum2{
            one,
            two,
            three
          }
        }
      `);

      strictEqual(runner.context.experimental_sdkPackage.enums[0].name, "Enum1");
      strictEqual(
        runner.context.experimental_sdkPackage.enums[0].usage,
        UsageFlags.Input | UsageFlags.Output
      );
    });

    it("projected name", async () => {
      await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          @projectedName("java", "JavaEnum1")
          enum Enum1{
            @projectedName("java", "JavaOne")
            One: "one",
            two,
            three
          }
        }
      `);

      async function helper(emitterName: string, enumName: string, enumValueName: string) {
        const runner = await createTcgcTestRunnerForEmitter(emitterName);
        const { Enum1 } = (await runner.compile(`
        @service({})
        namespace MyService {
          #suppress "deprecated" "for testing"
          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          @projectedName("java", "JavaEnum1")
          enum Enum1{
            #suppress "deprecated" "for testing"
            @projectedName("java", "JavaOne")
            One: "one",
            two,
            three
          }
        }
      `)) as { Enum1: Enum };
        const enum1 = getSdkEnum(runner.context, Enum1);
        strictEqual(enum1.name, enumName);
        strictEqual(enum1.values[0].name, enumValueName);
      }
      await helper("@azure-tools/typespec-csharp", "Enum1", "One");
      await helper("@azure-tools/typespec-java", "JavaEnum1", "JavaOne");
    });

    it("union as enum rename", async () => {
      const { TestUnion } = (await runner.compileWithCustomization(
        `
        @service({})
        namespace N {
          @test
          union TestUnion{
            @clientName("ARename")
            "A",
            "B": "B_v",
            string
          }
          op x(body: TestUnion): void;
        }
      `,
        `
        namespace Customizations;

        @@clientName(N.TestUnion, "TestUnionRename");
        @@clientName(N.TestUnion.B, "BRename");
      `
      )) as { TestUnion: Union };

      const enumType = getClientType(runner.context, TestUnion);
      strictEqual(enumType.kind, "enum");
      strictEqual(enumType.name, "TestUnionRename");
      strictEqual(enumType.isUnionAsEnum, true);
      strictEqual(enumType.values[0].name, "ARename");
      strictEqual(enumType.values[1].name, "BRename");
    });

    it("union as enum with hierarchy", async () => {
      const { Test } = (await runner.compile(
        `
        @service({})
        namespace N {
          @test
          union Test{
            A,
            B,
            C,
            null
          }

          union A {
            "A1",
            "A2",
          }

          union B {
            "B",
            string
          }

          enum C {
            "C"
          }
          op x(body: Test): void;
        }
      `
      )) as { Test: Union };

      const enumType = getClientType(runner.context, Test);
      strictEqual(enumType.kind, "enum");
      strictEqual(enumType.name, "Test");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(enumType.nullable, true);
      strictEqual(enumType.isUnionAsEnum, true);
      const values = enumType.values;
      strictEqual(values.length, 4);
      strictEqual(enumType.isFixed, false);

      ok(values.find((x) => x.kind === "enumvalue" && x.name === "A1" && x.value === "A1"));
      ok(values.find((x) => x.kind === "enumvalue" && x.name === "A2" && x.value === "A2"));
      ok(values.find((x) => x.kind === "enumvalue" && x.name === "B" && x.value === "B"));
      ok(values.find((x) => x.kind === "enumvalue" && x.name === "C" && x.value === "C"));
    });

    it("union as enum with hierarchy without flatten", async () => {
      runner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
        "flatten-union-as-enum": false,
      });
      const { Test } = (await runner.compile(
        `
        @service({})
        namespace N {
          @test
          union Test{
            A,
            B,
            C,
            null
          }

          union A {
            "A1",
            "A2",
          }

          union B {
            "B",
            string
          }

          enum C {
            "C"
          }
          op x(body: Test): void;
        }
      `
      )) as { Test: Union };

      const unionType = getClientType(runner.context, Test);
      strictEqual(unionType.kind, "union");
      strictEqual(unionType.name, "Test");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(unionType.nullable, true);
      const values = unionType.values;
      strictEqual(values.length, 3);
      const a = values[0] as SdkEnumType;
      strictEqual(a.name, "A");
      strictEqual(a.kind, "enum");
      strictEqual(a.isUnionAsEnum, true);
      strictEqual(a.values[0].name, "A1");
      strictEqual(a.values[0].value, "A1");
      strictEqual(a.values[1].name, "A2");
      strictEqual(a.values[1].value, "A2");

      const b = values[1] as SdkEnumType;
      strictEqual(b.name, "B");
      strictEqual(b.kind, "enum");
      strictEqual(b.isUnionAsEnum, true);
      strictEqual(b.values[0].name, "B");
      strictEqual(b.values[0].value, "B");

      const c = values[2] as SdkEnumType;
      strictEqual(c.name, "C");
      strictEqual(c.kind, "enum");
      strictEqual(c.isUnionAsEnum, false);
      strictEqual(c.values[0].name, "C");
      strictEqual(c.values[0].value, "C");
    });

    it("anonymous union as enum with hierarchy", async () => {
      const { Test } = (await runner.compile(
        `
        @service({})
        namespace N {
          enum LR {
            left,
            right,
          }
          enum UD {
            up,
            down,
          }
          
          @test
          model Test {
            color: LR | UD;
          }
          op read(@body body: Test): void;
        }
      `
      )) as { Test: Model };

      const modelType = getClientType(runner.context, Test) as SdkModelType;
      const enumType = modelType.properties[0].type as SdkEnumType;
      strictEqual(enumType.name, "TestColor");
      strictEqual(enumType.isGeneratedName, true);
      strictEqual(enumType.isUnionAsEnum, true);
      strictEqual(enumType.crossLanguageDefinitionId, "TestColor");
      const values = enumType.values;
      strictEqual(values[0].name, "left");
      strictEqual(values[0].value, "left");
      strictEqual(values[0].valueType.kind, "string");
      strictEqual(values[1].name, "right");
      strictEqual(values[1].value, "right");
      strictEqual(values[1].valueType.kind, "string");
      strictEqual(values[2].name, "up");
      strictEqual(values[2].value, "up");
      strictEqual(values[2].valueType.kind, "string");
      strictEqual(values[3].name, "down");
      strictEqual(values[3].value, "down");
      strictEqual(values[3].valueType.kind, "string");
    });

    it("anonymous union as enum with hierarchy without flatten", async () => {
      runner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
        "flatten-union-as-enum": false,
      });
      const { Test } = (await runner.compile(
        `
        @service({})
        namespace N {
          enum LR {
            left,
            right,
          }
          enum UD {
            up,
            down,
          }
          
          @test
          model Test {
            color: LR | UD;
          }
          op read(@body body: Test): void;
        }
      `
      )) as { Test: Model };

      const modelType = getClientType(runner.context, Test) as SdkModelType;
      const unionType = modelType.properties[0].type as SdkUnionType;
      strictEqual(unionType.name, "TestColor");
      strictEqual(unionType.isGeneratedName, true);
      const values = unionType.values;
      const lr = values[0] as SdkEnumType;
      strictEqual(lr.name, "LR");
      strictEqual(lr.isUnionAsEnum, false);
      strictEqual(lr.values[0].name, "left");
      strictEqual(lr.values[1].name, "right");
      strictEqual(lr.isFixed, true);
      const ud = values[1] as SdkEnumType;
      strictEqual(ud.name, "UD");
      strictEqual(ud.isUnionAsEnum, false);
      strictEqual(ud.values[0].name, "up");
      strictEqual(ud.values[1].name, "down");
      strictEqual(ud.isFixed, true);
    });

    it("versioned enums", async () => {
      await runner.compile(
        `
        @versioned(Versions)
        @service()
        namespace DemoService;

        enum Versions {
          v1,
          v2,
        }
      `
      );
      const enums = runner.context.experimental_sdkPackage.enums;
      strictEqual(enums.length, 1);
      strictEqual(enums[0].name, "Versions");
      strictEqual(enums[0].usage, UsageFlags.ApiVersionEnum);
    });

    it("usage propagation for enum value", async () => {
      await runner.compile(
        `
        @service({})
        namespace N {
          enum LR {
            left,
            right,
          }
          union UD {
            up: "up",
            down: "down",
          }
          
          @test
          model Test {
            prop1: LR.left;
            prop2: UD.up;
          }
          op read(@body body: Test): void;
        }
      `
      );
      const enums = runner.context.experimental_sdkPackage.enums;
      strictEqual(enums.length, 2);
      strictEqual(enums[0].name, "LR");
      strictEqual(enums[0].usage, UsageFlags.Input);
      strictEqual(enums[1].name, "UD");
      strictEqual(enums[1].usage, UsageFlags.Input);
    });
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
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(jsonEncodedProp.nameInClient, "jsonEncodedAndProjectedName");
      strictEqual(jsonEncodedProp.name, "jsonEncodedAndProjectedName");

      // wire name test with deprecated projected
      const jsonProjectedProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "realWireName"
      );
      ok(jsonProjectedProp);
      //eslint-disable-next-line deprecation/deprecation
      strictEqual(jsonProjectedProp.nameInClient, "jsonProjectedName");
      strictEqual(jsonProjectedProp.name, "jsonProjectedName");

      // regular
      const regularProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "regular"
      );
      ok(regularProp);
      // eslint-disable-next-line deprecation/deprecation
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
      await runner.compile(`
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
      const sdkModel = runner.context.experimental_sdkPackage.models.find(
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
    });
  });
  describe("SdkModelType", () => {
    it("basic", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService {
          model InputModel {
            prop: string
          }

          model OutputModel {
            prop: string
          }

          op test(@body input: InputModel): OutputModel;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["InputModel", "OutputModel"].sort());
    });

    it("models in Record", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService {
          model InnerModel {
            prop: string
          }

          op test(@body input: Record<InnerModel>): void;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["InnerModel"].sort());
    });

    it("models in Array", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService {
          model InnerModel {
            prop: string
          }

          op test(@body input: InnerModel[]): void;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["InnerModel"].sort());
    });

    it("embedded models", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService {
          model InnerModel {
            prop: string
          }

          model InputModel {
            prop: InnerModel
          }

          op test(@body input: InputModel): void;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["InputModel", "InnerModel"].sort());
    });

    it("base model", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService {
          model BaseModel {
            prop: string
          }

          model InputModel extends BaseModel {
            prop2: string
          }

          op test(@body input: InputModel): void;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["InputModel", "BaseModel"].sort());
    });

    it("derived model", async () => {
      await runner.compileWithBuiltInService(`
      model InputModel {
        prop: string
      }

      model DerivedModel extends InputModel {
        prop2: string
      }

      op test(@body input: DerivedModel): void;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["InputModel", "DerivedModel"].sort());
    });

    it("recursive model", async () => {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model RecursiveModel {
        prop: RecursiveModel
      }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const recursiveModel = models[0];
      strictEqual(recursiveModel.name, "RecursiveModel");
      strictEqual(recursiveModel.kind, "model");
      strictEqual(recursiveModel.properties.length, 1);
      const prop = recursiveModel.properties[0];
      strictEqual(prop.kind, "property");
      //eslint-disable-next-line deprecation/deprecation
      strictEqual(prop.nameInClient, "prop");
      strictEqual(prop.name, "prop");
      strictEqual(prop.type.kind, "model");
      strictEqual(prop.type.name, "RecursiveModel");
    });

    it("discriminator model", async () => {
      await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        age: int32;
      }

      @discriminator("sharktype")
      model Shark extends Fish {
        kind: "shark";
      }

      model Salmon extends Fish {
        kind: "salmon";
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      model SawShark extends Shark {
        sharktype: "saw";
      }

      model GoblinShark extends Shark {
        sharktype: "goblin";
      }

      @get
      op getModel(): Fish;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      const fish = models.find((x) => x.name === "Fish");
      ok(fish);
      const kindProperty = fish.properties[0];
      ok(kindProperty);
      strictEqual(kindProperty.name, "kind");
      strictEqual(kindProperty.kind, "property");
      strictEqual(kindProperty.discriminator, true);
      strictEqual(kindProperty.type.kind, "string");
      strictEqual(kindProperty.__raw, undefined);
      strictEqual(fish.discriminatorProperty, kindProperty);
      const shark = models.find((x) => x.name === "Shark");
      ok(shark);
      strictEqual(shark.properties.length, 2);
      const sharktypeProperty = shark.properties[0];
      ok(sharktypeProperty);
      strictEqual(sharktypeProperty.name, "sharktype");
      strictEqual(sharktypeProperty.kind, "property");
      strictEqual(sharktypeProperty.discriminator, true);
      strictEqual(sharktypeProperty.type.kind, "string");
      strictEqual(shark.discriminatorProperty, sharktypeProperty);
    });

    it("single discriminated model", async () => {
      await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        age: int32;
      }

      @get
      op getModel(): Fish;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const fish = models.find((x) => x.name === "Fish");
      ok(fish);
      const kindProperty = fish.properties[0];
      ok(kindProperty);
      strictEqual(kindProperty.name, "kind");
      strictEqual(kindProperty.kind, "property");
      strictEqual(kindProperty.discriminator, true);
      strictEqual(kindProperty.type.kind, "string");
      strictEqual(kindProperty.__raw, undefined);
      strictEqual(kindProperty.type.__raw, undefined);
      strictEqual(fish.discriminatorProperty, kindProperty);
    });

    it("enum discriminator model", async () => {
      await runner.compileWithBuiltInService(`
      enum DogKind {
        Golden: "golden",
      }

      @discriminator("kind")
      model Dog {
        kind: DogKind;
        weight: int32;
      }

      model Golden extends Dog {
        kind: DogKind.Golden;
      }

      @route("/extensible-enum")
      @get
      op getExtensibleModel(): Dog;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const golden = models.find((x) => x.name === "Golden");
      ok(golden);

      const kind = golden.properties.find(
        (x) => x.kind === "property" && x.serializedName === "kind"
      );
      ok(kind);
      strictEqual(kind.type.kind, "enumvalue");
      strictEqual(kind.type.value, "golden");

      const dog = models.find((x) => x.name === "Dog");
      ok(dog);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const dogKind = runner.context.experimental_sdkPackage.enums[0];

      const dogKindProperty = dog.properties.find(
        (x) => x.kind === "property" && x.serializedName === "kind"
      );
      ok(dogKindProperty);
      strictEqual(dogKindProperty.kind, "property");
      strictEqual(dogKindProperty.type, dogKind);
      strictEqual(dog.discriminatorProperty, dogKindProperty);
    });

    it("union to extensible enum values", async () => {
      await runner.compileWithBuiltInService(`
      union PetKind {
        @doc("Cat")
        Cat: "cat",
        @doc("Dog")
        Dog: "dog",
        string,
      }

      @route("/extensible-enum")
      @put
      op putPet(@body petKind: PetKind): void;
      `);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const petKind = runner.context.experimental_sdkPackage.enums[0];
      strictEqual(petKind.name, "PetKind");
      strictEqual(petKind.isFixed, false);
      strictEqual(petKind.valueType.kind, "string");
      const values = petKind.values;
      deepStrictEqual(
        values.map((x) => x.name),
        ["Cat", "Dog"]
      );

      const catValue = values.find((x) => x.name === "Cat");
      ok(catValue);
      strictEqual(catValue.value, "cat");
      strictEqual(catValue.description, "Cat");
      strictEqual(catValue.enumType, petKind);
      strictEqual(catValue.valueType, petKind.valueType);
      strictEqual(catValue.kind, "enumvalue");

      const dogValue = values.find((x) => x.name === "Dog");
      ok(dogValue);
      strictEqual(dogValue.value, "dog");
      strictEqual(dogValue.description, "Dog");
      strictEqual(dogValue.enumType, petKind);
      strictEqual(dogValue.valueType, petKind.valueType);
      strictEqual(dogValue.kind, "enumvalue");
    });

    it("template variable of anonymous union", async () => {
      await runner.compileWithBuiltInService(`
      interface GetAndSend<Type> {
        get(): {
          prop: Type;
        };
      
        send(prop: Type): void;
      }
      
      @route("/string-extensible")
      interface StringExtensible extends GetAndSend<string | "b" | "c"> {}
      `);
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.enums.length, 1);
      const prop = sdkPackage.enums.find((x) => x.name === "GetResponseProp" && x.isGeneratedName);
      ok(prop);
      strictEqual(prop.isFixed, false);
      strictEqual(prop.valueType.kind, "string");
      const resp = sdkPackage.models.find((x) => x.name === "GetResponse" && x.isGeneratedName);
      ok(resp);
      strictEqual(resp.properties[0].type, prop);
    });

    it("property of anonymous union as enum", async () => {
      await runner.compileWithBuiltInService(`
      model Pet {
        kind: string | "cat" | "dog";
      }

      @route("/extensible-enum")
      @put
      op putPet(@body pet: Pet): void;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const pet = models.find((x) => x.name === "Pet");

      const enums = runner.context.experimental_sdkPackage.enums;
      const kind = enums.find((x) => x.name === "PetKind");
      ok(pet && kind);
      ok(kind.isGeneratedName);
      const kindProperty = pet.properties.find((x) => (x.name = "kind"));
      ok(kindProperty);
      strictEqual(kindProperty.type, kind);
    });

    it("enum discriminator model without base discriminator property", async () => {
      await runner.compileWithBuiltInService(`
      enum DogKind {
        Golden: "golden",
      }

      @discriminator("kind")
      model Dog {
        weight: int32;
      }

      model Golden extends Dog {
        kind: DogKind.Golden;
      }

      @route("/extensible-enum")
      @get
      op getExtensibleModel(): Dog;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const golden = models.find((x) => x.name === "Golden");
      ok(golden);

      const kind = golden.properties.find(
        (x) => x.kind === "property" && x.serializedName === "kind"
      );
      ok(kind);
      strictEqual(kind.type.kind, "enumvalue");
      strictEqual(kind.type.value, "golden");

      const dog = models.find((x) => x.name === "Dog");
      ok(dog);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const dogKind = runner.context.experimental_sdkPackage.enums[0];

      const dogKindProperty = dog.properties[0];
      ok(dogKindProperty);
      strictEqual(dogKindProperty.type, dogKind);
    });

    it("discriminator", async () => {
      await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        age: int32;
      }

      @discriminator("sharktype")
      model Shark extends Fish {
        kind: "shark";
        sharktype: string;
      }

      model Salmon extends Fish {
        kind: "salmon";
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      model SawShark extends Shark {
        sharktype: "saw";
      }

      model GoblinShark extends Shark {
        sharktype: "goblin";
      }

      @get
      op getModel(): Fish;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      const shark = models.find((x) => x.name === "Shark");
      ok(shark);
      strictEqual(shark.properties.length, 2);
      const sharktypeProperty = shark.properties.find((x) => x.name === "sharktype");
      ok(sharktypeProperty);
      strictEqual(sharktypeProperty.kind, "property");
      strictEqual(sharktypeProperty.discriminator, true);
      strictEqual(sharktypeProperty.type.kind, "string");
    });

    it("union discriminator", async () => {
      await runner.compileWithBuiltInService(`
      union KindType {
        string,
        shark: "shark",
        salmon: "salmon"
      };

      @discriminator("kind")
      model Fish {
        age: int32;
      }

      model Shark extends Fish {
        kind: KindType.shark;
        hasFin: boolean;
      }

      model Salmon extends Fish {
        kind: KindType.salmon;
        norweigan: boolean;
      }

      @get
      op getModel(): Fish;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
      const fish = models.find((x) => x.name === "Fish");
      ok(fish);
      let kindTypeProperty = fish.properties.find((x) => x.name === "kind");
      ok(kindTypeProperty);
      strictEqual(kindTypeProperty.type.kind, "enum");
      strictEqual(kindTypeProperty.type.isUnionAsEnum, true);
      strictEqual(fish.discriminatorProperty, kindTypeProperty);
      const shark = models.find((x) => x.name === "Shark");
      ok(shark);
      strictEqual(shark.discriminatorValue, "shark");
      kindTypeProperty = shark.properties.find((x) => x.name === "kind");
      ok(kindTypeProperty);
      strictEqual(kindTypeProperty.type.kind, "enumvalue");
      const salmon = models.find((x) => x.name === "Salmon");
      ok(salmon);
      kindTypeProperty = salmon.properties.find((x) => x.name === "kind");
      ok(kindTypeProperty);
      strictEqual(kindTypeProperty.type.kind, "enumvalue");
      strictEqual(salmon.discriminatorValue, "salmon");

      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const kindType = runner.context.experimental_sdkPackage.enums.find(
        (x) => x.name === "KindType"
      );
      ok(kindType);
      strictEqual(kindType.isFixed, false);
    });

    it("discriminator rename", async () => {
      await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        @clientName("type")
        @encodedName("application/json", "@data.kind")
        kind: string;
        age: int32;
      }

      model Salmon extends Fish {
        kind: "salmon";
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      @get
      op getModel(): Fish;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const fish = models.find((x) => x.name === "Fish");
      ok(fish);
      strictEqual(fish.properties.length, 2);
      const discriminatorProperty = fish.properties.find((x) => x.name === "type");
      ok(discriminatorProperty);
      strictEqual(discriminatorProperty.kind, "property");
      strictEqual(discriminatorProperty.discriminator, true);
      strictEqual(discriminatorProperty.type.kind, "string");
      strictEqual(discriminatorProperty.serializedName, "@data.kind");
    });

    it("filterOutCoreModels true", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithBuiltInAzureCoreService(`
      @resource("users")
      @doc("Details about a user.")
      model User {
        @key
        @doc("The user's id.")
        @visibility("read")
        id: int32;

        @doc("The user's name.")
        name: string;
      }

      @doc("Creates or updates a User")
      op createOrUpdate is ResourceCreateOrUpdate<User>;
      `);
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].name, "User");
    });

    it("filterOutCoreModels false", async () => {
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
          @doc("The user's id.")
          @visibility("read")
          id: int32;

          @doc("The user's name.")
          name: string;
        }

        @doc("Creates or updates a User")
        op createOrUpdate is ResourceCreateOrUpdate<User>;
      `);
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 4);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["Error", "ErrorResponse", "InnerError", "User"].sort());
    });

    it("lro core filterOutCoreModels true", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
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
      }

      @doc("Gets status.")
      op getStatus is GetResourceOperationStatus<User>;

      @doc("Polls status.")
      @pollingOperation(My.Service.getStatus)
      op createOrUpdateUser is LongRunningResourceCreateOrUpdate<User>;
      `);
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].name, "User");
    });

    it("lro core filterOutCoreModels false", async () => {
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
      }

      @doc("Gets status.")
      op getStatus is GetResourceOperationStatus<User>;

      @doc("Polls status.")
      @pollingOperation(My.Service.getStatus)
      op createOrUpdateUser is LongRunningResourceCreateOrUpdate<User>;
      `);
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(
        modelNames,
        [
          "Error",
          "ErrorResponse",
          "InnerError",
          "User",
          "ResourceOperationStatusUserUserError",
        ].sort()
      );
      strictEqual(runnerWithCore.context.experimental_sdkPackage.enums.length, 1);
      strictEqual(runnerWithCore.context.experimental_sdkPackage.enums[0].name, "OperationState");
    });
    it("no models filter core", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 0);
    });
    it("no models don't filter core", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 0);
    });
    it("input usage", async () => {
      await runner.compileWithBuiltInService(`
        model InputModel {
          prop: string
        }
        op operation(@body input: InputModel): void;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Input);
      strictEqual(models.filter((x) => x.usage === UsageFlags.Input).length, 1);
      strictEqual(models.filter((x) => x.usage === UsageFlags.Output).length, 0);
    });

    it("output usage", async () => {
      await runner.compileWithBuiltInService(`
        model OutputModel {
          prop: string
        }
        op operation(): OutputModel;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Output);

      strictEqual(models.filter((x) => x.usage === UsageFlags.Output).length, 1);
      strictEqual(models.filter((x) => x.usage === UsageFlags.Input).length, 0);
    });

    it("roundtrip usage", async () => {
      await runner.compileWithBuiltInService(`
        model RoundtripModel {
          prop: string
        }
        op operation(@body input: RoundtripModel): RoundtripModel;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);

      strictEqual(models.filter((x) => (x.usage & UsageFlags.Output) > 0).length, 1);
      strictEqual(models.filter((x) => (x.usage & UsageFlags.Input) > 0).length, 1);
      strictEqual(models.filter((x) => x.usage === UsageFlags.None).length, 0);
    });

    it("usage propagation", async () => {
      await runner.compileWithBuiltInService(`
        @discriminator("kind")
        model Fish {
          age: int32;
        }

        @discriminator("sharktype")
        model Shark extends Fish {
          kind: "shark";
        }

        model Salmon extends Fish {
          kind: "salmon";
          friends?: Fish[];
          hate?: Record<Fish>;
          partner?: Fish;
        }

        model SawShark extends Shark {
          sharktype: "saw";
        }

        model GoblinShark extends Shark {
          sharktype: "goblin";
        }
        op operation(@body input: Shark): Shark;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);
    });

    it("unnamed model", async () => {
      await runner.compileWithBuiltInService(`
        model Test {
          prop1: {innerProp1: string};
          prop2: {innerProp2: string};
        }
        op func(
          @body body: Test
        ): void;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
      const propreties: string[] = [];
      models.forEach((model) => {
        model.properties.forEach((prop) => {
          propreties.push(prop.name);
        });
      });
      propreties.sort();
      deepStrictEqual(propreties, ["innerProp1", "innerProp2", "prop1", "prop2"]);
    });
    it("model access transitive closure", async () => {
      await runner.compileWithBuiltInService(`
        model Test {
          prop: string;
        }
        @access(Access.internal)
        op func(
          @body body: Test
        ): void;
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].access, "internal");
    });

    it("complicated access transitive closure", async () => {
      await runner.compileWithBuiltInService(`
        model Test1 {
          prop: Test2;
        }
        model Test2 {
          prop: string;
        }
        @access(Access.internal)
        @route("/func1")
        op func1(
          @body body: Test1
        ): void;

        model Test3 {
          prop: string;
        }

        @access(Access.internal)
        @route("/func2")
        op func2(
          @body body: Test3
        ): void;

        @route("/func3")
        op func3(
          @body body: Test3
        ): void;

        model Test4 {
          prop: Test5;
        }

        model Test5 {
          prop: Test6;
        }

        model Test6 {
          prop: string;
        }

        @access(Access.internal)
        @route("/func4")
        op func4(
          @body body: Test4
        ): void;

        @route("/func5")
        op func5(
          @body body: Test6
        ): void;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 6);

      const Test1 = models.find((x) => x.name === "Test1");
      ok(Test1);
      strictEqual(Test1.access, "internal");

      const Test2 = models.find((x) => x.name === "Test2");
      ok(Test2);
      strictEqual(Test2.access, "internal");

      const Test3 = models.find((x) => x.name === "Test3");
      ok(Test3);
      strictEqual(Test3.access, undefined);

      const Test4 = models.find((x) => x.name === "Test4");
      ok(Test4);
      strictEqual(Test4.access, "internal");

      const Test5 = models.find((x) => x.name === "Test5");
      ok(Test5);
      strictEqual(Test5.access, "internal");

      const Test6 = models.find((x) => x.name === "Test6");
      ok(Test6);
      strictEqual(Test6.access, undefined);
    });
    it("additionalProperties string", async () => {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AdditionalPropertiesModel extends Record<string> {
          prop: string;
        }
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AdditionalPropertiesModel2 is Record<unknown> {
          prop: string;
        }
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model NoAdditionalPropertiesModel {
          prop: string;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
      const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
      const AdditionalPropertiesModel2 = models.find(
        (x) => x.name === "AdditionalPropertiesModel2"
      );
      const NonAdditionalPropertiesModel = models.find(
        (x) => x.name === "NoAdditionalPropertiesModel"
      );
      ok(AdditionalPropertiesModel && AdditionalPropertiesModel2 && NonAdditionalPropertiesModel);
      strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "string");
      strictEqual(AdditionalPropertiesModel.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "any");
      strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
      strictEqual(NonAdditionalPropertiesModel.additionalProperties, undefined);
    });
    it("additionalProperties usage", async () => {
      await runner.compileWithBuiltInService(`
        @service({})
        namespace MyService {
          model AdditionalPropertiesModel extends Record<Test> {
          }
  
          model AdditionalPropertiesModel2 is Record<Test> {
          }

          model Test {
          }

          op test(@body input: AdditionalPropertiesModel): AdditionalPropertiesModel2;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
      const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
      const AdditionalPropertiesModel2 = models.find(
        (x) => x.name === "AdditionalPropertiesModel2"
      );
      const Test = models.find((x) => x.name === "Test");
      ok(AdditionalPropertiesModel && AdditionalPropertiesModel2 && Test);

      strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "model");
      strictEqual(AdditionalPropertiesModel.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel.usage, UsageFlags.Input);
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "model");
      strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel2.usage, UsageFlags.Output);
      strictEqual(Test.usage, UsageFlags.Input | UsageFlags.Output);
    });
    it("crossLanguageDefinitionId", async () => {
      await runner.compile(`
        @service({})
        namespace MyService {
          @usage(Usage.input)
          @access(Access.public)
          model InputModel {}

          @usage(Usage.output)
          @access(Access.public)
          model OutputModel {}
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const inputModel = models.find((x) => x.name === "InputModel");
      ok(inputModel);
      strictEqual(inputModel.crossLanguageDefinitionId, "MyService.InputModel");
      const outputModel = models.find((x) => x.name === "OutputModel");
      ok(outputModel);
      strictEqual(outputModel.crossLanguageDefinitionId, "MyService.OutputModel");
    });

    it("template model", async () => {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Catalog is TrackedResource<CatalogProperties> {
          @pattern("^[A-Za-z0-9_-]{1,50}$")
          @key("catalogName")
          @segment("catalogs")
          name: string;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model CatalogProperties {
          test?: string;
        }

        model TrackedResource<TProperties extends {}> {
          properties?: TProperties;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Deployment is TrackedResource<DeploymentProperties> {
          @key("deploymentName")
          @segment("deployments")
          name: string;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model DeploymentProperties {
          deploymentId?: string;
          deploymentDateUtc?: utcDateTime;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 4);
      const catalog = models.find((x) => x.name === "Catalog");
      const deployment = models.find((x) => x.name === "Deployment");
      ok(catalog && deployment);
      strictEqual(catalog.properties.length, 2);
      strictEqual(deployment.properties.length, 2);
    });
    it("model with deprecated annotation", async () => {
      await runner.compileAndDiagnose(`
        @service({})
        namespace MyService;
        #deprecated "no longer support"
        model Test {
        }
        op func(
          @body body: Test
        ): void;
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].deprecation, "no longer support");
    });

    it("orphan model", async () => {
      await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          model Model1{}

          model Model2{}
        }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].name, "Model1");
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);
    });

    it("model with client hierarchy", async () => {
      await runner.compile(`
        @service({})
        namespace Test1Client {
          model T1 {
            prop: string;
          }
          model T2 {
            prop: string;
          }
          @route("/b")
          namespace B {
            op x(): void;

            @route("/c")
            interface C {
              op y(): T1;
            }

            @route("/d")
            namespace D {
              op z(@body body: T2): void;
            }
          }
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
    });
    it("error model", async () => {
      await runner.compileWithBuiltInService(`
        @error
        model ApiError {
          code: string;
        }

        op test(): ApiError;
      `);
      const models = getAllModels(runner.context);
      strictEqual(models.length, 1);
      strictEqual(models[0].kind, "model");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(models[0].isError, true);
      const rawModel = models[0].__raw;
      ok(rawModel);
      strictEqual(rawModel.kind, "Model");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(isErrorOrChildOfError(runner.context, rawModel), true);
    });

    it("error model inheritance", async () => {
      await runner.compileWithBuiltInService(`
        model ValidResponse {
          prop: string;
        };

        @error
        model ApiError {
          code: string
        };

        model FourHundredError extends ApiError {
          @statusCode
          @minValue(400)
          @maxValue(499)
          statusCode: int32;
        };
        model FourZeroFourError extends FourHundredError {
          @statusCode
          statusCode: 404;
        };
        model FiveHundredError extends ApiError {
          @statusCode
          @minValue(500)
          @maxValue(599)
          statusCode: int32;
        };

        op test(): ValidResponse | FourZeroFourError | FiveHundredError;
      `);
      const models = getAllModels(runner.context);
      strictEqual(models.length, 5);
      // eslint-disable-next-line deprecation/deprecation
      const errorModels = models.filter((x) => x.kind === "model" && x.isError);
      deepStrictEqual(errorModels.map((x) => x.name).sort(), [
        "ApiError",
        "FiveHundredError",
        "FourHundredError",
        "FourZeroFourError",
      ]);
      // eslint-disable-next-line deprecation/deprecation
      const validModel = models.filter((x) => x.kind === "model" && !x.isError);
      deepStrictEqual(
        validModel.map((x) => x.name),
        ["ValidResponse"]
      );
    });
  });
  describe("SdkMultipartFormType", () => {
    it("multipart form basic", async function () {
      await runner.compileWithBuiltInService(`
      model MultiPartRequest {
        id: string;
        profileImage: bytes;
      }

      op basic(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.kind, "model");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(model.isFormDataType, true);
      ok((model.usage & UsageFlags.MultipartFormData) > 0);
      strictEqual(model.name, "MultiPartRequest");
      strictEqual(model.properties.length, 2);
      const id = model.properties.find((x) => x.name === "id");
      ok(id);
      strictEqual(id.kind, "property");
      strictEqual(id.type.kind, "string");
      const profileImage = model.properties.find((x) => x.name === "profileImage");
      ok(profileImage);
      strictEqual(profileImage.kind, "property");
      strictEqual(profileImage.isMultipartFileInput, true);
    });
    it("multipart conflicting model usage", async function () {
      await runner.compile(
        `
        @service({title: "Test Service"}) namespace TestService;
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
        }
  
        @post op multipartUse(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
        @put op jsonUse(@body body: MultiPartRequest): NoContentResponse;
      `
      );
      const [_, diagnostics] = getAllModelsWithDiagnostics(runner.context);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/conflicting-multipart-model-usage",
      });
    });
    it("multipart resolving conflicting model usage with spread", async function () {
      await runner.compileWithBuiltInService(
        `
        model B {
          doc: bytes
        }
        
        model A {
          ...B
        }
        
        @put op multipartOperation(@header contentType: "multipart/form-data", ...A): void;
        @post op normalOperation(...B): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelA = models.find((x) => x.name === "A");
      ok(modelA);
      strictEqual(modelA.kind, "model");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(modelA.isFormDataType, true);
      ok((modelA.usage & UsageFlags.MultipartFormData) > 0);
      strictEqual(modelA.properties.length, 1);
      const modelAProp = modelA.properties[0];
      strictEqual(modelAProp.kind, "property");
      strictEqual(modelAProp.isMultipartFileInput, true);

      const modelB = models.find((x) => x.name === "B");
      ok(modelB);
      strictEqual(modelB.kind, "model");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(modelB.isFormDataType, false);
      ok((modelB.usage & UsageFlags.MultipartFormData) === 0);
      strictEqual(modelB.properties.length, 1);
      strictEqual(modelB.properties[0].type.kind, "bytes");
    });

    it("multipart with non-formdata model property", async function () {
      await runner.compileWithBuiltInService(
        `
        model Address {
          city: string;
        }

        model AddressFirstAppearance {
          address: Address;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AddressSecondAppearance {
          address: Address;
        }
        
        @put op multipartOne(@header contentType: "multipart/form-data", @body body: AddressFirstAppearance): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
    });

    it("multipart with list of bytes", async function () {
      await runner.compileWithBuiltInService(
        `
        model PictureWrapper {
          pictures: bytes[];
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: PictureWrapper): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.properties.length, 1);
      const pictures = model.properties[0];
      strictEqual(pictures.kind, "property");
      strictEqual(pictures.isMultipartFileInput, true);
    });

    it("multipart with encoding bytes raises error", async function () {
      await runner.compile(
        `
        @service({title: "Test Service"}) namespace TestService;
        model EncodedBytesMFD {
          @encode("base64")
          pictures: bytes;
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: EncodedBytesMFD): void;
        `
      );
      ok(runner.context.diagnostics?.length);
      expectDiagnostics(runner.context.diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/encoding-multipart-bytes",
      });
    });

    it("multipart with reused error model", async function () {
      await runner.compileWithBuiltInService(
        `
        model PictureWrapper {
          pictures: bytes[];
        }

        model ErrorResponse {
          errorCode: string;
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: PictureWrapper): void | ErrorResponse;
        @post op normalOp(): void | ErrorResponse;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const pictureWrapper = models.find((x) => x.name === "PictureWrapper");
      ok(pictureWrapper);
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(pictureWrapper.isFormDataType, true);
      ok((pictureWrapper.usage & UsageFlags.MultipartFormData) > 0);

      const errorResponse = models.find((x) => x.name === "ErrorResponse");
      ok(errorResponse);
      strictEqual(errorResponse.kind, "model");
      // eslint-disable-next-line deprecation/deprecation
      strictEqual(errorResponse.isFormDataType, false);
      ok((errorResponse.usage & UsageFlags.MultipartFormData) === 0);
    });

    it("expands model into formData parameters", async function () {
      await runner.compileWithBuiltInService(`
        @doc("A widget.")
        model Widget {
          @key("widgetName")
          name: string;
          displayName: string;
          description: string;
          color: string;
        }

        model WidgetForm is Widget {
          @header("content-type")
          contentType: "multipart/form-data";
        }

        @route("/widgets")
        interface Widgets {
          @route(":upload")
          @post
          upload(...WidgetForm): Widget;
        }
        `);
      const formDataMethod = runner.context.experimental_sdkPackage.clients[0].methods[0];
      strictEqual(formDataMethod.kind, "basic");
      strictEqual(formDataMethod.name, "upload");
      strictEqual(formDataMethod.parameters.length, 3);

      const widgetFormParam = formDataMethod.parameters.find((x) => x.name === "widgetForm");
      ok(widgetFormParam);
      ok(formDataMethod.parameters.find((x) => x.name === "accept"));
      strictEqual(formDataMethod.parameters[0].name, "name");
      strictEqual(formDataMethod.parameters[0].type.kind, "string");
      strictEqual(formDataMethod.parameters[1].name, "widgetForm");
      strictEqual(formDataMethod.parameters[1].type.kind, "model");
      strictEqual(formDataMethod.parameters[1].type.name, "WidgetForm");

      const formDataOp = formDataMethod.operation;
      strictEqual(formDataOp.parameters.length, 2);
      ok(formDataOp.parameters.find((x) => x.name === "accept" && x.kind === "header"));
      ok(formDataOp.parameters.find((x) => x.name === "contentType" && x.kind === "header"));

      const formDataBodyParam = formDataOp.bodyParam;
      ok(formDataBodyParam);
      strictEqual(formDataBodyParam.type.kind, "model");
      strictEqual(formDataBodyParam.type.name, "Widget");
      strictEqual(formDataBodyParam.correspondingMethodParams.length, 4);
      deepStrictEqual(
        formDataBodyParam.correspondingMethodParams.map((x) => x.name).sort(),
        ["color", "description", "displayName", "name"].sort()
      );
    });

    it("usage doesn't apply to properties of a form data", async function () {
      await runner.compileWithBuiltInService(`
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
          address: Address;
        }

        model Address {
          city: string;
        }

        @post
        op upload(@header contentType: "multipart/form-data", @body body: MultiPartRequest): void;
        `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const multiPartRequest = models.find((x) => x.name === "MultiPartRequest");
      ok(multiPartRequest);
      ok(multiPartRequest.usage & UsageFlags.MultipartFormData);

      const address = models.find((x) => x.name === "Address");
      ok(address);
      strictEqual(address.usage & UsageFlags.MultipartFormData, 0);
    });
  });
  describe("SdkTupleType", () => {
    it("model with tupled properties", async function () {
      await runner.compileAndDiagnose(`
        @service({})
        namespace MyService;
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model MyFlow {
          scopes: ["https://security.microsoft.com/.default"];
          test: [int32, string]
        }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const scopes = models[0].properties.find((x) => x.name === "scopes");
      ok(scopes);
      strictEqual(scopes.type.kind, "tuple");
      strictEqual(scopes.type.values[0].kind, "constant");
      strictEqual(scopes.type.values[0].valueType.kind, "string");
      strictEqual(scopes.type.values[0].value, "https://security.microsoft.com/.default");
      const test = models[0].properties.find((x) => x.name === "test");
      ok(test);
      strictEqual(test.type.kind, "tuple");
      strictEqual(test.type.values[0].kind, "int32");
      strictEqual(test.type.values[1].kind, "string");
    });
  });
});

function getSdkBodyModelPropertyTypeHelper(runner: SdkTestRunner): SdkBodyModelPropertyType {
  const sdkModel = runner.context.experimental_sdkPackage.models.find((x) => x.kind === "model");
  ok(sdkModel);
  strictEqual(sdkModel.kind, "model");
  const property = sdkModel.properties[0];
  strictEqual(property.kind, "property");
  return property;
}

function getSdkTypeHelper(runner: SdkTestRunner): SdkType {
  return getSdkBodyModelPropertyTypeHelper(runner).type;
}
