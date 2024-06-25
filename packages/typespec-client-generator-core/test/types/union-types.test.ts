import { UsageFlags } from "@typespec/compiler";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkArrayType } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: union types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

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

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "float32");
  });

  it("nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: string | float32 | null;
        }
      `);

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "union");
    strictEqual(sdkType.values.length, 2);
    strictEqual(sdkType.values[0].kind, "string");
    strictEqual(sdkType.values[1].kind, "float32");
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
    strictEqual(elementType.kind, "nullable");
    strictEqual(elementType.type.kind, "float32");
  });

  it("record with nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: Record<string | float32 | null>;
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "dict");
    const elementType = sdkType.valueType;
    strictEqual(elementType.kind, "nullable");

    const elementTypeValueType = elementType.type;
    strictEqual(elementTypeValueType.kind, "union");
    strictEqual(elementTypeValueType.values.length, 2);
    strictEqual(elementTypeValueType.values[0].kind, "string");
    strictEqual(elementTypeValueType.values[1].kind, "float32");
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
    strictEqual(elementType.kind, "nullable");
    strictEqual(elementType.type.kind, "float32");
  });

  it("array with nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: (string | float32 | null)[];
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    const elementType = sdkType.valueType;
    strictEqual(elementType.kind, "nullable");
    const elementTypeValueType = elementType.type;
    strictEqual(elementTypeValueType.kind, "union");
    strictEqual(elementTypeValueType.values.length, 2);
    strictEqual(elementTypeValueType.values[0].kind, "string");
    strictEqual(elementTypeValueType.values[1].kind, "float32");
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

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model TestSpread {
          name: string;
          ...Record<string|null>
        }
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);

    const extendsType = models.find((x) => x.name === "TestExtends");
    ok(extendsType);
    strictEqual(extendsType.kind, "model");
    const additionalProperties = extendsType.additionalProperties;
    ok(additionalProperties);
    strictEqual(additionalProperties.kind, "nullable");
    strictEqual(additionalProperties.type.kind, "string");

    const isType = models.find((x) => x.name === "TestIs");
    ok(isType);
    strictEqual(isType.kind, "model");
    const isTypeAdditionalProperties = isType.additionalProperties;
    ok(isTypeAdditionalProperties);
    strictEqual(isTypeAdditionalProperties.kind, "nullable");
    strictEqual(isTypeAdditionalProperties.type.kind, "string");

    const spreadType = models.find((x) => x.name === "TestSpread");
    ok(spreadType);
    strictEqual(spreadType.kind, "model");
    const spreadTypeAdditionalProperties = spreadType.additionalProperties;
    ok(spreadTypeAdditionalProperties);
    strictEqual(spreadTypeAdditionalProperties.kind, "nullable");
    strictEqual(spreadTypeAdditionalProperties.type.kind, "string");
  });

  it("additional property nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model TestExtends extends Record<string|float32|null> {
          name: string;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model TestIs is Record<string|float32|null> {
          name: string;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model TestSpread {
          name: string;
          ...Record<string|float32|null>
        }
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);

    const extendsType = models.find((x) => x.name === "TestExtends");
    ok(extendsType);
    strictEqual(extendsType.kind, "model");

    const extendsTypeAdditionalProperties = extendsType.additionalProperties;
    ok(extendsTypeAdditionalProperties);
    strictEqual(extendsTypeAdditionalProperties.kind, "nullable");
    const extendsAdPropUnderlyingType = extendsTypeAdditionalProperties.type;
    strictEqual(extendsAdPropUnderlyingType.kind, "union");
    strictEqual(extendsAdPropUnderlyingType.name, "TestExtendsAdditionalProperty");
    strictEqual(extendsAdPropUnderlyingType.isGeneratedName, true);
    strictEqual(extendsAdPropUnderlyingType.values.length, 2);
    strictEqual(extendsAdPropUnderlyingType.values[0].kind, "string");
    strictEqual(extendsAdPropUnderlyingType.values[1].kind, "float32");

    const isType = models.find((x) => x.name === "TestIs");
    ok(isType);
    strictEqual(isType.kind, "model");
    const isTypeAdditionalProperties = isType.additionalProperties;
    ok(isTypeAdditionalProperties);
    strictEqual(isTypeAdditionalProperties.kind, "nullable");

    const isTypeAdditionalPropertiesUnderlyingType = isTypeAdditionalProperties.type;
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.kind, "union");
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.name, "TestIsAdditionalProperty");
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.isGeneratedName, true);
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.values.length, 2);
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.values[0].kind, "string");
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.values[1].kind, "float32");

    const spreadType = models.find((x) => x.name === "TestSpread");
    ok(spreadType);
    strictEqual(spreadType.kind, "model");

    const spreadTypeAdditionalProperties = spreadType.additionalProperties;
    ok(spreadTypeAdditionalProperties);
    strictEqual(spreadTypeAdditionalProperties.kind, "nullable");

    const spreadTypeAdditionalPropertiesUnderlyingType = spreadTypeAdditionalProperties.type;
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.kind, "union");
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.name, "TestSpreadAdditionalProperty");
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.isGeneratedName, true);
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.values.length, 2);
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.values[0].kind, "string");
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.values[1].kind, "float32");
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

    const models = runner.context.sdkPackage.models;
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

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "enum");
    strictEqual(sdkType.isUnionAsEnum, false);
    strictEqual(sdkType.name, "PetKind");

    const values = sdkType.values;
    strictEqual(values.length, 3);
  });

  it("model with nullable union as enum", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Home {
        pet: "dog" | "cat" | "bird" | string | null;
      }
      `);

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "enum");
    strictEqual(sdkType.isUnionAsEnum, true);
    strictEqual(sdkType.name, "HomePet");

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

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const model = models.find((x) => x.kind === "model" && x.name === "Test");
    ok(model);
    const nullableType = model.properties[0].type;
    strictEqual(nullableType.kind, "nullable");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "model");
    strictEqual(sdkType.name, "PropertyModel");
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

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const model = models.find((x) => x.kind === "model" && x.name === "Test");
    ok(model);
    const nullableModel = models.find((x) => x.kind === "model" && x.name === "TestNullable");
    ok(nullableModel);
    strictEqual(model.properties[0].type.kind, "union");
    const unionType = model.properties[0].type;
    strictEqual(unionType.kind, "union");
    for (const v of unionType.values) {
      if (v.kind === "model") {
        strictEqual(v.name, "ModelType");
      } else {
        strictEqual(v.kind, "constant");
      }
    }
    const nullableProp = nullableModel.properties[0];
    strictEqual(nullableProp.type.kind, "nullable");
    strictEqual(nullableProp.type.type.kind, "union");
    strictEqual(nullableProp.type.type.values.length, 3);

    // now check without null with help of helper function
    strictEqual(nullableModel.properties[0].type.kind, "nullable");
    const sdkType = nullableProp.type.type;
    strictEqual(sdkType.kind, "union");
    for (const v of sdkType.values) {
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

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const foo = models.find((x) => x.name === "Foo");
    ok(foo);
    strictEqual(foo.usage, UsageFlags.Input);
    strictEqual(foo.access, "internal");
    const enums = runner.context.sdkPackage.enums;
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

      @usage(Usage.input | Usage.output)
      @access(Access.public)
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

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const foo = models.find((x) => x.name === "Foo");
    ok(foo);
    strictEqual(foo.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(foo.access, "public");
    const enums = runner.context.sdkPackage.enums;
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

    const enums = runner.context.sdkPackage.enums;
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
