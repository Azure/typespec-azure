import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Enum, UsageFlags } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepEqual, deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkArrayType,
  SdkBodyModelPropertyType,
  SdkEnumType,
  SdkEnumValueType,
  SdkModelType,
  SdkType,
  SdkUnionType,
} from "../src/interfaces.js";
import { getAllModels, getSdkEnum, isReadOnly } from "../src/types.js";
import {
  SdkTestRunner,
  createSdkTestRunner,
  createTcgcTestRunnerForEmitter,
  getAllModelsAssertNoDiagnostics,
} from "./test-host.js";

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
      await runner.compileWithBuiltInService(
        `
        @format("guid")
        scalar guid extends string;

        @format("url")
        scalar url extends string;

        @format("uuid")
        scalar uuid extends string;

        @format("password")
        scalar password extends string;

        @format("armId")
        scalar armId extends string;

        @format("ipAddress")
        scalar ipAddress extends string;

        @format("azureLocation")
        scalar azureLocation extends string;

        @format("etag")
        scalar etag extends string;

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          guidScalar: guid;
          urlScalar: url;
          uuidScalar: uuid;
          passwordScalar: password;
          armIdScalar: armId;
          ipAddressScalar: ipAddress;
          azureLocationScalar: azureLocation;
          etagScalar: etag;

          @format("guid")
          guidProperty: string;
          @format("url")
          urlProperty: string;
          @format("uuid")
          uuidProperty: string;
          @format("password")
          passwordProperty: string;
          @format("armId")
          armIdProperty: string;
          @format("ipAddress")
          ipAddressProperty: string;
          @format("azureLocation")
          azureLocationProperty: string;
          @format("etag")
          etagProperty: string;
        }
      `
      );
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      for (const property of (models[0] as SdkModelType).properties) {
        strictEqual(
          property.type.kind,
          (property as SdkBodyModelPropertyType).serializedName
            .replace("Scalar", "")
            .replace("Property", "")
        );
      }
    });

    it("known values", async function () {
      await runner.compileWithBuiltInService(
        `
        enum TestEnum{
          one,
          two,
          three,
        }

        @knownValues(TestEnum)
        scalar testScalar extends string;

        model TestModel {
          prop1: testScalar;
          @knownValues(TestEnum)
          prop2: string;
        }

        op func(
          @body body: TestModel
        ): void;
      `
      );
      const [models, diagnostics] = getAllModels(runner.context);
      expectDiagnostics(diagnostics, []);
      const m = models.find((x) => x.name === "TestModel")!;
      const e1 = models.find((x) => x.name === "TestEnum")!;
      const e2 = models.find((x) => x.name === "testScalar")!;
      strictEqual(e1.kind, "enum");
      strictEqual(e1.valueType.kind, "string");
      strictEqual(e2.kind, "enum");
      strictEqual(e2.valueType.kind, "string");
      for (const property of (m as SdkModelType).properties) {
        if (property.nameInClient === "prop1") {
          strictEqual(property.type, e2);
        } else if (property.nameInClient === "prop2") {
          strictEqual(property.type, e1);
        }
      }
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

    it("float seconds decorated scalar", async function () {
      await runner.compileWithBuiltInService(
        `
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
      strictEqual(sdkType.kind, "datetime");
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
      strictEqual(sdkType.kind, "datetime");
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
      strictEqual(sdkType.kind, "datetime");
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
      strictEqual(sdkType.kind, "datetime");
      strictEqual(sdkType.wireType.kind, "int64");
      strictEqual(sdkType.encode, "unixTimestamp");
    });

    it("unixTimestamp array", async function () {
      await runner.compileWithBuiltInService(
        `
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
      strictEqual(sdkType.valueType.kind, "datetime");
      strictEqual(sdkType.valueType.wireType.kind, "int64");
      strictEqual(sdkType.valueType.encode, "unixTimestamp");
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
      strictEqual(sdkType.name, undefined);
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
      strictEqual(sdkType.nullable, true);
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
      strictEqual(elementType.nullable, true);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 4);
      const modelWithNamedUnionProperty = models.find(
        (x) => x.kind === "model" && x.name === "ModelWithNamedUnionProperty"
      )! as SdkModelType;
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
      strictEqual(sdkType.nullable, true);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);
      const model = models.find((x) => x.kind === "model" && x.name === "Test")! as SdkModelType;
      const sdkType = model.properties[0].type;
      strictEqual(sdkType.kind, "model");
      strictEqual(sdkType.name, "PropertyModel");
      strictEqual(sdkType.nullable, true);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 3);
      const model = models.find((x) => x.kind === "model" && x.name === "Test")! as SdkModelType;
      const nullableModel = models.find(
        (x) => x.kind === "model" && x.name === "TestNullable"
      )! as SdkModelType;
      strictEqual(model.properties[0].type.kind, "union");
      strictEqual(model.properties[0].type.nullable, false);
      for (const v of (model.properties[0].type as SdkUnionType).values) {
        if (v.kind === "model") {
          strictEqual(v.name, "ModelType");
        } else {
          strictEqual(v.kind, "constant");
        }
      }
      strictEqual(nullableModel.properties[0].type.kind, "union");
      strictEqual(nullableModel.properties[0].type.nullable, true);
      for (const v of (nullableModel.properties[0].type as SdkUnionType).values) {
        if (v.kind === "model") {
          strictEqual(v.name, "ModelType");
        } else {
          strictEqual(v.kind, "constant");
        }
      }
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);
      const sdkType = models.find((x) => x.kind === "enum")! as SdkEnumType;
      strictEqual(sdkType.isFixed, false);
      strictEqual(sdkType.name, "DaysOfWeekExtensibleEnum");
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);
      const sdkType = models.find((x) => x.kind === "enum")! as SdkEnumType;
      strictEqual(sdkType.isFixed, false);
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

    it("string fixed", async function () {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @service({})
        @test namespace MyService {
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
        }
      `);
      const models = getAllModelsAssertNoDiagnostics(runnerWithCore.context);
      strictEqual(models.length, 2);
      const sdkType = models.find((x) => x.kind === "enum")! as SdkEnumType;
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      strictEqual(models[0].access, "internal");
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);
      const integersEnum = models.find((x) => x.kind === "enum")! as SdkEnumType;
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      strictEqual(models[0].deprecation, "no longer support");
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models[0].name, "Enum1");
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);
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
      `)) as { Enum1: Enum };
        const enum1 = getSdkEnum(runner.context, Enum1);
        strictEqual(enum1.name, enumName);
        strictEqual(enum1.values[0].name, enumValueName);
      }
      await helper("@azure-tools/typespec-csharp", "Enum1", "One");
      await helper("@azure-tools/typespec-java", "JavaEnum1", "JavaOne");
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
        @test
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        @projectedName("java", "JavaTest")
        model Test {
          @projectedName("java", "javaProjectedName")
          javaWireName: string;
          @projectedName("client", "clientName")
          clientProjectedName: string;
          @projectedName("json", "projectedWireName")
          @encodedName("application/json", "encodedWireName")
          jsonEncodedAndProjectedName: string;
          @projectedName("json", "realWireName")
          jsonProjectedName: string; // deprecated
          regular: string;
        }
      `);

      const sdkModel = getAllModelsAssertNoDiagnostics(runner.context)[0] as SdkModelType;
      strictEqual(sdkModel.name, "JavaTest");

      // Java projected name test
      const javaProjectedProp = sdkModel.properties.find(
        (x) => x.nameInClient === "javaProjectedName"
      )!;
      strictEqual(javaProjectedProp.kind, "property");
      strictEqual(javaProjectedProp.serializedName, "javaWireName");

      // client projected name test

      const clientProjectedProp = sdkModel.properties.find((x) => x.nameInClient === "clientName")!;
      strictEqual(clientProjectedProp.kind, "property");
      strictEqual(clientProjectedProp.serializedName, "clientProjectedName");

      // wire name test with encoded and projected
      const jsonEncodedProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "encodedWireName"
      )!;
      strictEqual(jsonEncodedProp.nameInClient, "jsonEncodedAndProjectedName");

      // wire name test with deprecated projected
      const jsonProjectedProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "realWireName"
      )!;
      strictEqual(jsonProjectedProp.nameInClient, "jsonProjectedName");

      // regular
      const regularProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "regular"
      )!;
      strictEqual(regularProp.nameInClient, "regular");
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
      const sdkModel = getAllModelsAssertNoDiagnostics(runner.context).find(
        (x) => x.kind === "model"
      )! as SdkModelType;
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      const recursiveModel = models[0];
      strictEqual(recursiveModel.name, "RecursiveModel");
      strictEqual(recursiveModel.kind, "model");
      strictEqual(recursiveModel.properties.length, 1);
      const prop = recursiveModel.properties[0];
      strictEqual(prop.kind, "property");
      strictEqual(prop.nameInClient, "prop");
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 5);
      const fish = models.find((x) => x.name === "Fish")! as SdkModelType;
      const kindProperty = fish.properties.find(
        (x) => x.nameInClient === "kind"
      )! as SdkBodyModelPropertyType;
      strictEqual(kindProperty.discriminator, true);
      strictEqual(kindProperty.type.kind, "string");
      strictEqual(kindProperty.__raw, undefined);
      const shark = models.find((x) => x.name === "Shark")! as SdkModelType;
      strictEqual(shark.properties.length, 2);
      const sharktypeProperty = shark.properties.find(
        (x) => x.nameInClient === "sharktype"
      )! as SdkBodyModelPropertyType;
      strictEqual(sharktypeProperty.discriminator, true);
      strictEqual(sharktypeProperty.type.kind, "string");
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      const fish = models.find((x) => x.name === "Fish")! as SdkModelType;
      const kindProperty = fish.properties.find(
        (x) => x.nameInClient === "kind"
      )! as SdkBodyModelPropertyType;
      strictEqual(kindProperty.discriminator, true);
      strictEqual(kindProperty.type.kind, "string");
      strictEqual(kindProperty.__raw, undefined);
      strictEqual(kindProperty.type.__raw, undefined);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 3);

      const golden = models.find((x) => x.name === "Golden")! as SdkModelType;

      const kind = golden.properties.find(
        (x) => (x as SdkBodyModelPropertyType).serializedName === "kind"
      )! as SdkBodyModelPropertyType;
      strictEqual((kind.type as SdkEnumValueType).value, "golden");

      const dog = models.find((x) => x.name === "Dog")! as SdkModelType;
      const dogKind = models.find((x) => x.name === "DogKind")! as SdkEnumType;

      const dogKindProperty = dog.properties.find(
        (x) => (x as SdkBodyModelPropertyType).serializedName === "kind"
      )! as SdkBodyModelPropertyType;
      strictEqual(dogKindProperty.type, dogKind);
    });

    it("union to extensible enum values", async () => {
      await runner.compileWithBuiltInService(`
      union PetKind {
        Cat: "cat",
        Dog: "dog",
        string,
      }

      @route("/extensible-enum")
      @put
      op putPet(@body petKind: PetKind): void;
      `);
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      const petKind = models[0] as SdkEnumType;
      strictEqual(petKind.name, "PetKind");
      strictEqual(petKind.isFixed, false);
      strictEqual(petKind.valueType.kind, "string");
      const values = petKind.values;
      deepStrictEqual(
        values.map((x) => x.name),
        ["Cat", "Dog"]
      );

      const catValue = values.find((x) => x.name === "Cat")!;
      strictEqual(catValue.value, "cat");
      strictEqual(catValue.enumType, petKind);
      strictEqual(catValue.valueType, petKind.valueType);
      strictEqual(catValue.kind, "enumvalue");

      const dogValue = values.find((x) => x.name === "Dog")!;
      strictEqual(dogValue.value, "dog");
      strictEqual(dogValue.enumType, petKind);
      strictEqual(dogValue.valueType, petKind.valueType);
      strictEqual(dogValue.kind, "enumvalue");
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 3);

      const golden = models.find((x) => x.name === "Golden")! as SdkModelType;

      const kind = golden.properties.find(
        (x) => (x as SdkBodyModelPropertyType).serializedName === "kind"
      )! as SdkBodyModelPropertyType;
      strictEqual((kind.type as SdkEnumValueType).value, "golden");

      const dog = models.find((x) => x.name === "Dog")! as SdkModelType;
      const dogKind = models.find((x) => x.name === "DogKind")! as SdkEnumType;

      const dogKindProperty = dog.properties.find(
        (x) => (x as SdkBodyModelPropertyType).serializedName === "kind"
      )! as SdkBodyModelPropertyType;
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 5);
      const shark = models.find((x) => x.name === "Shark")! as SdkModelType;
      strictEqual(shark.properties.length, 2);
      const sharktypeProperty = shark.properties.find(
        (x) => x.nameInClient === "sharktype"
      )! as SdkBodyModelPropertyType;
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 3);
      const shark = models.find((x) => x.name === "Shark")! as SdkModelType;
      strictEqual(shark.discriminatorValue, "shark");
      const salmon = models.find((x) => x.name === "Salmon")! as SdkModelType;
      strictEqual(salmon.discriminatorValue, "salmon");
    });

    it("filterOutCoreModels true", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        @service
        namespace MyService {

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
        }
      `);
      const models = getAllModelsAssertNoDiagnostics(runnerWithCore.context);
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
      await runnerWithCore.compile(`
        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        @service
        namespace MyService {

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
        }
      `);
      const models = getAllModelsAssertNoDiagnostics(runnerWithCore.context);
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
      await runnerWithCore.compile(`

        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        @service
        namespace MyService {
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
          @pollingOperation(MyService.getStatus)
          op createOrUpdateUser is LongRunningResourceCreateOrUpdate<User>;
        }
      `);
      const models = getAllModelsAssertNoDiagnostics(runnerWithCore.context);
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
      await runnerWithCore.compile(`
        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        @service
        namespace MyService {
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
          @pollingOperation(MyService.getStatus)
          op createOrUpdateUser is LongRunningResourceCreateOrUpdate<User>;
        }
      `);
      const models = getAllModelsAssertNoDiagnostics(runnerWithCore.context);
      strictEqual(models.length, 6);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(
        modelNames,
        [
          "Error",
          "ErrorResponse",
          "InnerError",
          "User",
          "ResourceOperationStatus",
          "OperationState",
        ].sort()
      );
    });
    it("no models filter core", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 0);
    });
    it("no models don't filter core", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 0);
    });
    it("input usage", async () => {
      await runner.compileWithBuiltInService(`
        model InputModel {
          prop: string
        }
        op operation(@body input: InputModel): void;
      `);
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Input);

      strictEqual(
        getAllModelsAssertNoDiagnostics(runner.context, { input: true, output: false }).length,
        1
      );
      strictEqual(getAllModelsAssertNoDiagnostics(runner.context, { input: false }).length, 0);
    });

    it("output usage", async () => {
      await runner.compileWithBuiltInService(`
        model OutputModel {
          prop: string
        }
        op operation(): OutputModel;
      `);
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Output);

      strictEqual(
        getAllModelsAssertNoDiagnostics(runner.context, { input: false, output: true }).length,
        1
      );
      strictEqual(getAllModelsAssertNoDiagnostics(runner.context, { output: false }).length, 0);
    });

    it("roundtrip usage", async () => {
      await runner.compileWithBuiltInService(`
        model RoundtripModel {
          prop: string
        }
        op operation(@body input: RoundtripModel): RoundtripModel;
      `);
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);

      strictEqual(
        getAllModelsAssertNoDiagnostics(runner.context, { input: false, output: true }).length,
        1
      );
      strictEqual(
        getAllModelsAssertNoDiagnostics(runner.context, { input: true, output: false }).length,
        1
      );
      strictEqual(
        getAllModelsAssertNoDiagnostics(runner.context, { input: false, output: false }).length,
        0
      );
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 3);
      const propreties: string[] = [];
      models.forEach((model) => {
        (model as SdkModelType).properties.forEach((prop) => {
          propreties.push(prop.nameInClient);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 6);

      const Test1 = models.find((x) => x.name === "Test1")!;
      strictEqual(Test1.access, "internal");

      const Test2 = models.find((x) => x.name === "Test2")!;
      strictEqual(Test2.access, "internal");

      const Test3 = models.find((x) => x.name === "Test3")!;
      strictEqual(Test3.access, undefined);

      const Test4 = models.find((x) => x.name === "Test4")!;
      strictEqual(Test4.access, "internal");

      const Test5 = models.find((x) => x.name === "Test5")!;
      strictEqual(Test5.access, "internal");

      const Test6 = models.find((x) => x.name === "Test6")!;
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 3);
      const AdditionalPropertiesModel = models.find(
        (x) => x.name === "AdditionalPropertiesModel"
      )! as SdkModelType;
      const AdditionalPropertiesModel2 = models.find(
        (x) => x.name === "AdditionalPropertiesModel2"
      )! as SdkModelType;
      const NonAdditionalPropertiesModel = models.find(
        (x) => x.name === "NoAdditionalPropertiesModel"
      )! as SdkModelType;
      strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "string");
      strictEqual(AdditionalPropertiesModel.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "any");
      strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
      strictEqual(NonAdditionalPropertiesModel.additionalProperties, undefined);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);
      const inputModel = models.find((x) => x.name === "InputModel")!;
      strictEqual(inputModel.crossLanguageDefinitionId, "MyService.InputModel");
      const outputModel = models.find((x) => x.name === "OutputModel")!;
      strictEqual(outputModel.crossLanguageDefinitionId, "MyService.OutputModel");
    });

    it("template model", async () => {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Catalog is TrackedResource<CatalogProperties> {
          @pattern("^[A-Za-z0-9_-]{1,50}$")
          @key("catalogName")
          @path
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
          @path
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 4);
      const catalog = models.find((x) => x.name === "Catalog")! as SdkModelType;
      const deployment = models.find((x) => x.name === "Deployment")! as SdkModelType;
      strictEqual(catalog.properties.length, 1);
      strictEqual(deployment.properties.length, 1);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      const model = models[0] as SdkModelType;
      strictEqual(model.kind, "model");
      strictEqual(model.isFormDataType, true);
      strictEqual(model.name, "MultiPartRequest");
      strictEqual(model.properties.length, 2);
      const id = model.properties.find((x) => x.nameInClient === "id")!;
      strictEqual(id.kind, "property");
      strictEqual(id.type.kind, "string");
      const profileImage = model.properties.find((x) => x.nameInClient === "profileImage")!;
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
      const [_, diagnostics] = getAllModels(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);
      const modelA = models.find((x) => x.name === "A")!;
      strictEqual(modelA.kind, "model");
      strictEqual(modelA.isFormDataType, true);
      strictEqual(modelA.properties.length, 1);
      const modelAProp = modelA.properties[0];
      strictEqual(modelAProp.kind, "property");
      strictEqual(modelAProp.isMultipartFileInput, true);

      const modelB = models.find((x) => x.name === "B")!;
      strictEqual(modelB.kind, "model");
      strictEqual(modelB.isFormDataType, false);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      const model = models[0] as SdkModelType;
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
      expectDiagnostics(getAllModels(runner.context)[1], {
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
      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 2);

      const pictureWrapper = models.find((x) => x.name === "PictureWrapper")!;
      strictEqual(pictureWrapper.kind, "model");
      strictEqual(pictureWrapper.isFormDataType, true);

      const errorResponse = models.find((x) => x.name === "ErrorResponse")!;
      strictEqual(errorResponse.kind, "model");
      strictEqual(errorResponse.isFormDataType, false);
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

      const models = getAllModelsAssertNoDiagnostics(runner.context);
      strictEqual(models.length, 1);
      const scopes = (models[0] as SdkModelType).properties.find(
        (x) => x.nameInClient === "scopes"
      )! as SdkBodyModelPropertyType;
      strictEqual(scopes.type.kind, "tuple");
      strictEqual(scopes.type.values[0].kind, "constant");
      strictEqual(scopes.type.values[0].valueType.kind, "string");
      strictEqual(scopes.type.values[0].value, "https://security.microsoft.com/.default");
      const test = (models[0] as SdkModelType).properties.find(
        (x) => x.nameInClient === "test"
      )! as SdkBodyModelPropertyType;
      strictEqual(test.type.kind, "tuple");
      strictEqual(test.type.values[0].kind, "int32");
      strictEqual(test.type.values[1].kind, "string");
    });
  });
});

function getSdkBodyModelPropertyTypeHelper(runner: SdkTestRunner): SdkBodyModelPropertyType {
  const sdkModel = getAllModelsAssertNoDiagnostics(runner.context).find(
    (x) => x.kind === "model"
  )! as SdkModelType;
  strictEqual(sdkModel.kind, "model");
  const property = sdkModel.properties[0];
  strictEqual(property.kind, "property");
  return property;
}

function getSdkTypeHelper(runner: SdkTestRunner): SdkType {
  return getSdkBodyModelPropertyTypeHelper(runner).type;
}
