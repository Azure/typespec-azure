import { deepStrictEqual, ok, strictEqual } from "assert";
import { afterEach, beforeEach, describe, it } from "vitest";
import { SdkArrayType, UsageFlags } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: union types", () => {
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
  it("primitive union", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        model Test {
          name: string | int32;
        }
      `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "union");
    strictEqual(sdkType.name, "TestName");
    strictEqual(sdkType.isGeneratedName, true);
    strictEqual(sdkType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(sdkType.access, "public");
    ok(sdkType.isGeneratedName);
    const values = sdkType.variantTypes;
    strictEqual(values.length, 2);
    strictEqual(values[0].kind, "string");
    strictEqual(values[1].kind, "int32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], sdkType);
  });
  it("nullable", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: float32 | null;
        }
      `);

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");
    strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(nullableType.access, "public");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], nullableType);
  });

  it("nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: string | float32 | null;
        }
      `);

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");
    strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(nullableType.access, "public");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "union");
    strictEqual(sdkType.variantTypes.length, 2);
    strictEqual(sdkType.variantTypes[0].kind, "string");
    strictEqual(sdkType.variantTypes[1].kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], nullableType);
  });

  it("record with nullable", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: Record<float32 | null>;
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "dict");
    const elementType = sdkType.valueType;
    strictEqual(elementType.kind, "nullable");
    strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(elementType.access, "public");
    strictEqual(elementType.type.kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], elementType);
  });

  it("record with nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: Record<string | float32 | null>;
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "dict");
    const elementType = sdkType.valueType;
    strictEqual(elementType.kind, "nullable");
    strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(elementType.access, "public");

    const elementTypeValueType = elementType.type;
    strictEqual(elementTypeValueType.kind, "union");
    strictEqual(elementTypeValueType.variantTypes.length, 2);
    strictEqual(elementTypeValueType.variantTypes[0].kind, "string");
    strictEqual(elementTypeValueType.variantTypes[1].kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], elementType);
  });

  it("array with nullable", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: (float32 | null)[];
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    const elementType = sdkType.valueType;
    strictEqual(elementType.kind, "nullable");
    strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(elementType.access, "public");
    strictEqual(elementType.type.kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], elementType);
  });

  it("array with nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Test {
          name: (string | float32 | null)[];
        }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    const elementType = sdkType.valueType;
    strictEqual(elementType.kind, "nullable");
    strictEqual(elementType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(elementType.access, "public");
    const elementTypeValueType = elementType.type;
    strictEqual(elementTypeValueType.kind, "union");
    strictEqual(elementTypeValueType.variantTypes.length, 2);
    strictEqual(elementTypeValueType.variantTypes[0].kind, "string");
    strictEqual(elementTypeValueType.variantTypes[1].kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], elementType);
  });

  it("additional property is nullable", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model TestExtends extends Record<string|null> {
          name: string;
        }

        @usage(Usage.input | Usage.output)
        model TestIs is Record<string|null> {
          name: string;
        }

        @usage(Usage.input | Usage.output)
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
    strictEqual(additionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(additionalProperties.access, "public");
    strictEqual(additionalProperties.type.kind, "string");

    deepStrictEqual(runner.context.sdkPackage.unions[0], additionalProperties);

    const isType = models.find((x) => x.name === "TestIs");
    ok(isType);
    strictEqual(isType.kind, "model");
    const isTypeAdditionalProperties = isType.additionalProperties;
    ok(isTypeAdditionalProperties);
    strictEqual(isTypeAdditionalProperties.kind, "nullable");
    strictEqual(isTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(isTypeAdditionalProperties.access, "public");
    strictEqual(isTypeAdditionalProperties.type.kind, "string");

    deepStrictEqual(runner.context.sdkPackage.unions[1], isTypeAdditionalProperties);

    const spreadType = models.find((x) => x.name === "TestSpread");
    ok(spreadType);
    strictEqual(spreadType.kind, "model");
    const spreadTypeAdditionalProperties = spreadType.additionalProperties;
    ok(spreadTypeAdditionalProperties);
    strictEqual(spreadTypeAdditionalProperties.kind, "nullable");
    strictEqual(spreadTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(spreadTypeAdditionalProperties.access, "public");
    strictEqual(spreadTypeAdditionalProperties.type.kind, "string");

    deepStrictEqual(runner.context.sdkPackage.unions[2], spreadTypeAdditionalProperties);
  });

  it("additional property nullable with more types", async function () {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model TestExtends extends Record<string|float32|null> {
          name: string;
        }

        @usage(Usage.input | Usage.output)
        model TestIs is Record<string|float32|null> {
          name: string;
        }

        @usage(Usage.input | Usage.output)
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
    strictEqual(extendsTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(extendsTypeAdditionalProperties.access, "public");
    const extendsAdPropUnderlyingType = extendsTypeAdditionalProperties.type;
    strictEqual(extendsAdPropUnderlyingType.kind, "union");
    strictEqual(extendsAdPropUnderlyingType.name, "TestExtendsAdditionalProperty");
    strictEqual(extendsAdPropUnderlyingType.isGeneratedName, true);
    strictEqual(extendsAdPropUnderlyingType.variantTypes.length, 2);
    strictEqual(extendsAdPropUnderlyingType.variantTypes[0].kind, "string");
    strictEqual(extendsAdPropUnderlyingType.variantTypes[1].kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], extendsTypeAdditionalProperties);

    const isType = models.find((x) => x.name === "TestIs");
    ok(isType);
    strictEqual(isType.kind, "model");
    const isTypeAdditionalProperties = isType.additionalProperties;
    ok(isTypeAdditionalProperties);
    strictEqual(isTypeAdditionalProperties.kind, "nullable");
    strictEqual(isTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(isTypeAdditionalProperties.access, "public");
    const isTypeAdditionalPropertiesUnderlyingType = isTypeAdditionalProperties.type;
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.kind, "union");
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.name, "TestIsAdditionalProperty");
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.isGeneratedName, true);
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.variantTypes.length, 2);
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.variantTypes[0].kind, "string");
    strictEqual(isTypeAdditionalPropertiesUnderlyingType.variantTypes[1].kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[1], isTypeAdditionalProperties);

    const spreadType = models.find((x) => x.name === "TestSpread");
    ok(spreadType);
    strictEqual(spreadType.kind, "model");
    const spreadTypeAdditionalProperties = spreadType.additionalProperties;
    ok(spreadTypeAdditionalProperties);
    strictEqual(spreadTypeAdditionalProperties.kind, "nullable");
    strictEqual(spreadTypeAdditionalProperties.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(spreadTypeAdditionalProperties.access, "public");
    const spreadTypeAdditionalPropertiesUnderlyingType = spreadTypeAdditionalProperties.type;
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.kind, "union");
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.name, "TestSpreadAdditionalProperty");
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.isGeneratedName, true);
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.variantTypes.length, 2);
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.variantTypes[0].kind, "string");
    strictEqual(spreadTypeAdditionalPropertiesUnderlyingType.variantTypes[1].kind, "float32");

    deepStrictEqual(runner.context.sdkPackage.unions[2], spreadTypeAdditionalProperties);
  });

  it("model with simple union property", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      model ModelWithSimpleUnionProperty {
        prop: int32 | int32[];
      }
      `);

    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "union");
    strictEqual(sdkType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(sdkType.access, "public");
    const values = sdkType.variantTypes;
    strictEqual(values.length, 2);
    strictEqual(values[0].kind, "int32");
    strictEqual(values[1].kind, "array");

    const elementType = (<SdkArrayType>values[1]).valueType;
    strictEqual(elementType.kind, "int32");

    deepStrictEqual(runner.context.sdkPackage.unions[0], sdkType);
  });

  it("model with named union", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      model BaseModel {
        name: string;
      }
      @usage(Usage.input | Usage.output)
      model Model1 extends BaseModel {
        prop1: int32;
      }
      @usage(Usage.input | Usage.output)
      model Model2 extends BaseModel {
        prop2: int32;
      }
      @usage(Usage.input | Usage.output)
      union MyNamedUnion {
        one: Model1,
        two: Model2,
      }

      @usage(Usage.input | Usage.output)
      model ModelWithNamedUnionProperty {
        prop: MyNamedUnion;
      }
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 4);
    const modelWithNamedUnionProperty = models.find(
      (x) => x.kind === "model" && x.name === "ModelWithNamedUnionProperty",
    );
    ok(modelWithNamedUnionProperty);
    const property = modelWithNamedUnionProperty.properties[0];
    strictEqual(property.kind, "property");
    const sdkType = property.type;
    strictEqual(sdkType.kind, "union");
    strictEqual(sdkType.name, "MyNamedUnion");
    strictEqual(sdkType.isGeneratedName, false);
    strictEqual(sdkType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(sdkType.access, "public");
    const variants = sdkType.variantTypes;
    strictEqual(variants.length, 2);
    strictEqual(variants[0].kind, "model");
    strictEqual(variants[0].name, "Model1");
    strictEqual(
      variants[0],
      models.find((x) => x.kind === "model" && x.name === "Model1"),
    );
    strictEqual(variants[1].kind, "model");
    strictEqual(variants[1].name, "Model2");
    strictEqual(
      variants[1],
      models.find((x) => x.kind === "model" && x.name === "Model2"),
    );

    deepStrictEqual(runner.context.sdkPackage.unions[0], sdkType);
  });

  it("model with nullable enum property", async function () {
    await runner.compileWithBuiltInService(`
      enum PetKind {
        dog, cat, bird
      }
      @usage(Usage.input | Usage.output)
      model Home {
        pet: PetKind | null;
      }
      `);

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");
    strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(nullableType.access, "public");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "enum");
    strictEqual(sdkType.isUnionAsEnum, false);
    strictEqual(sdkType.name, "PetKind");

    const values = sdkType.values;
    strictEqual(values.length, 3);

    deepStrictEqual(runner.context.sdkPackage.unions[0], nullableType);
  });

  it("model with nullable union as enum", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      model Home {
        pet: "dog" | "cat" | "bird" | string | null;
      }
      `);

    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");
    strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(nullableType.access, "public");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "enum");
    strictEqual(sdkType.isUnionAsEnum, true);
    strictEqual(sdkType.name, "HomePet");

    const values = sdkType.values;
    strictEqual(values.length, 3);

    deepStrictEqual(runner.context.sdkPackage.unions[0], nullableType);
  });

  it("model with nullable model property", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      model PropertyModel {
        internalProp: string;
      }

      @usage(Usage.input | Usage.output)
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
    strictEqual(nullableType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(nullableType.access, "public");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "model");
    strictEqual(sdkType.name, "PropertyModel");

    deepStrictEqual(runner.context.sdkPackage.unions[0], nullableType);
  });

  it("mix types", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      model ModelType {
        name: string;
      }

      @usage(Usage.input | Usage.output)
      model Test {
        prop: "none" | "auto" | ModelType;
      }

      @usage(Usage.input | Usage.output)
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
    const unionType = model.properties[0].type;
    strictEqual(unionType.kind, "union");
    strictEqual(unionType.name, "TestProp");
    strictEqual(unionType.isGeneratedName, true);
    strictEqual(unionType.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(unionType.access, "public");
    for (const v of unionType.variantTypes) {
      if (v.kind === "model") {
        strictEqual(v.name, "ModelType");
      } else {
        strictEqual(v.kind, "constant");
      }
    }
    deepStrictEqual(runner.context.sdkPackage.unions[0], unionType);

    const nullableProp = nullableModel.properties[0];
    strictEqual(nullableProp.type.kind, "nullable");
    strictEqual(nullableProp.type.usage, UsageFlags.Input | UsageFlags.Output);
    strictEqual(nullableProp.type.access, "public");
    strictEqual(nullableProp.type.type.kind, "union");
    strictEqual(nullableProp.type.type.variantTypes.length, 3);

    // now check without null with help of helper function
    strictEqual(nullableModel.properties[0].type.kind, "nullable");
    const sdkType = nullableProp.type.type;
    strictEqual(sdkType.kind, "union");
    for (const v of sdkType.variantTypes) {
      if (v.kind === "model") {
        strictEqual(v.name, "ModelType");
      } else {
        strictEqual(v.kind, "constant");
      }
    }

    deepStrictEqual(runner.context.sdkPackage.unions[1], nullableProp.type);
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
    strictEqual(foo.usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(foo.access, "internal");

    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 1);
    const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
    ok(unionAsEnum);
    strictEqual(unionAsEnum.usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(unionAsEnum.access, "internal");

    const unions = runner.context.sdkPackage.unions;
    strictEqual(unions.length, 1);
    strictEqual(unions[0].kind, "nullable");
    strictEqual(unions[0].usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(unions[0].access, "internal");
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

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const foo = models.find((x) => x.name === "Foo");
    ok(foo);
    strictEqual(foo.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
    strictEqual(foo.access, "public");
    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 1);
    const unionAsEnum = enums.find((x) => x.name === "UnionAsEnum");
    ok(unionAsEnum);
    strictEqual(unionAsEnum.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
    strictEqual(unionAsEnum.access, "public");

    const unions = runner.context.sdkPackage.unions;
    strictEqual(unions.length, 1);
    strictEqual(unions[0].kind, "nullable");
    strictEqual(unions[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
    strictEqual(unions[0].access, "public");
  });

  it("usage override for orphan union as enum", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
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

  it("union with only one literal", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        model Test {
          name: TestUnion;
        }

        union TestUnion {
          "A"
        }
      `,
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "enum");
    strictEqual(sdkType.name, "TestUnion");
    const values = sdkType.values;
    strictEqual(values.length, 1);
    strictEqual(values[0].value, "A");
    deepStrictEqual(runner.context.sdkPackage.enums[0], sdkType);
  });
});
