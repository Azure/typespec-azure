import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Enum, Model, Union } from "@typespec/compiler";
import { deepEqual, deepStrictEqual, ok, strictEqual } from "assert";
import { afterEach, beforeEach, describe, it } from "vitest";
import { SdkEnumType, SdkModelType, SdkUnionType, UsageFlags } from "../../src/interfaces.js";
import { getClientType, getSdkEnum } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: enum types", () => {
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
  it("string extensible", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
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
      model Test {
        prop: DaysOfWeekExtensibleEnum
      }
      `);

    strictEqual(runner.context.sdkPackage.models.length, 1);
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const sdkType = runner.context.sdkPackage.enums[0];
    strictEqual(sdkType.isFixed, true);
    strictEqual(sdkType.name, "DaysOfWeekExtensibleEnum");
    strictEqual(sdkType.crossLanguageDefinitionId, "TestService.DaysOfWeekExtensibleEnum");
    strictEqual(sdkType.valueType.kind, "string");
    strictEqual(sdkType.usage & UsageFlags.ApiVersionEnum, 0); // not a versioning enum
    strictEqual(sdkType.isUnionAsEnum, false);
    const values = sdkType.values;
    strictEqual(values.length, 7);
    const nameList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    deepEqual(
      values.map((x) => x.name),
      nameList,
    );
    deepEqual(
      values.map((x) => x.value),
      nameList,
    );
    for (const value of sdkType.values) {
      deepStrictEqual(value.enumType, sdkType);
      deepStrictEqual(value.valueType, sdkType.valueType);
    }
  });

  it("int extensible", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      enum Integers {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
      }

      @usage(Usage.input | Usage.output)
      model Test {
        prop: Integers
      }
      `);

    strictEqual(runner.context.sdkPackage.models.length, 1);
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const sdkType = runner.context.sdkPackage.enums[0];
    strictEqual(sdkType.isFixed, true);
    strictEqual(sdkType.name, "Integers");
    strictEqual(sdkType.crossLanguageDefinitionId, "TestService.Integers");
    strictEqual(sdkType.valueType.kind, "int32");
    const values = sdkType.values;
    strictEqual(values.length, 5);
    deepEqual(
      values.map((x) => x.name),
      ["one", "two", "three", "four", "five"],
    );
    deepEqual(
      values.map((x) => x.value),
      [1, 2, 3, 4, 5],
    );
  });

  it("float extensible", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      enum Floats {
        a: 1,
        b: 2.1,
        c: 3,
      }

      @usage(Usage.input | Usage.output)
      model Test {
        prop: Floats
      }
      `);

    const sdkType = runner.context.sdkPackage.enums[0];
    ok(sdkType);
    strictEqual(sdkType.isFixed, true);
    strictEqual(sdkType.name, "Floats");
    strictEqual(sdkType.crossLanguageDefinitionId, "TestService.Floats");
    strictEqual(sdkType.valueType.kind, "float32");
    const values = sdkType.values;
    strictEqual(values.length, 3);
    deepEqual(
      values.map((x) => x.name),
      ["a", "b", "c"],
    );
    deepEqual(
      values.map((x) => x.value),
      [1, 2.1, 3],
    );
  });

  it("union as enum float type", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      union Floats {
        float,
        a: 1,
        b: 2,
        c: 3,
      }

      @usage(Usage.input | Usage.output)
      model Test {
        prop: Floats
      }
      `);

    const sdkType = runner.context.sdkPackage.enums[0];
    strictEqual(sdkType.isFixed, false);
    strictEqual(sdkType.name, "Floats");
    strictEqual(sdkType.crossLanguageDefinitionId, "TestService.Floats");
    strictEqual(sdkType.valueType.kind, "float");
    const values = sdkType.values;
    strictEqual(values.length, 3);
    deepEqual(
      values.map((x) => x.name),
      ["a", "b", "c"],
    );
    deepEqual(
      values.map((x) => x.value),
      [1, 2, 3],
    );
  });

  it("union of union as enum float type", async function () {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      union BaseEnum {
        int32,
        a: 1,
      }
      
      @usage(Usage.input | Usage.output)
      union ExtendedEnum {
        BaseEnum,
        b: 2,
        c: 3,
      }

      @usage(Usage.input | Usage.output)
      model Test {
        prop: ExtendedEnum
      }
      `);
    const sdkType = runner.context.sdkPackage.enums[0];
    ok(sdkType);
    strictEqual(sdkType.isFixed, false);
    strictEqual(sdkType.name, "ExtendedEnum");
    strictEqual(sdkType.crossLanguageDefinitionId, "TestService.ExtendedEnum");
    strictEqual(sdkType.valueType.kind, "int32");
    const values = sdkType.values;
    strictEqual(values.length, 3);

    // since these union is named, it gets flattened into one
    ok(values.find((x) => x.name === "a" && x.value === 1));
    ok(values.find((x) => x.name === "b" && x.value === 2));
    ok(values.find((x) => x.name === "c" && x.value === 3));
  });

  it("string fixed", async function () {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      #suppress "@azure-tools/typespec-azure-core/use-extensible-enum" "For testing"
      @doc(".")
      @fixed
      @usage(Usage.input | Usage.output)
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
      model Test {
        @doc(".")
        prop: DaysOfWeekFixedEnum
      }
      `);
    strictEqual(runner.context.sdkPackage.models.length, 1);
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const sdkType = runner.context.sdkPackage.enums[0];
    strictEqual(sdkType.isFixed, true);
    strictEqual(sdkType.name, "DaysOfWeekFixedEnum");
    strictEqual(sdkType.crossLanguageDefinitionId, "My.Service.DaysOfWeekFixedEnum");
    strictEqual(sdkType.valueType.kind, "string");
    const values = sdkType.values;
    strictEqual(values.length, 7);
    const nameList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    deepEqual(
      values.map((x) => x.name),
      nameList,
    );
    deepEqual(
      values.map((x) => x.value),
      nameList,
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

    strictEqual(runner.context.sdkPackage.enums[0].access, "internal");
  });

  it("crossLanguageDefinitionId", async () => {
    await runner.compile(`
        @service({})
        namespace MyService {
          @usage(Usage.input | Usage.output)
          enum Integers {
            one: 1,
            two: 2,
            three: 3,
            four: 4,
            five: 5,
          }

          @usage(Usage.input | Usage.output)
          model Test {
            prop: Integers
          }
        }
      `);
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const integersEnum = runner.context.sdkPackage.enums[0];
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

    strictEqual(runner.context.sdkPackage.enums[0].deprecation, "no longer support");
  });

  it("orphan enum", async () => {
    await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
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

    strictEqual(runner.context.sdkPackage.enums[0].name, "Enum1");
    strictEqual(runner.context.sdkPackage.enums[0].usage, UsageFlags.Input | UsageFlags.Output);
  });

  it("projected name", async () => {
    await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
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
      const runner = await createSdkTestRunner({ emitterName });
      const { Enum1 } = (await runner.compile(`
        @service({})
        namespace MyService {
          #suppress "deprecated" "for testing"
          @test
          @usage(Usage.input | Usage.output)
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
      `,
    )) as { TestUnion: Union };

    const enumType = getClientType(runner.context, TestUnion);
    strictEqual(enumType.kind, "enum");
    strictEqual(enumType.name, "TestUnionRename");
    strictEqual(enumType.crossLanguageDefinitionId, "N.TestUnion");
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
      `,
    )) as { Test: Union };

    const nullableType = getClientType(runner.context, Test);
    strictEqual(nullableType.kind, "nullable");

    const enumType = nullableType.type;
    strictEqual(enumType.kind, "enum");
    strictEqual(enumType.name, "Test");
    strictEqual(enumType.crossLanguageDefinitionId, "N.Test");
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
    const { Foo } = (await runner.compile(
      `
        @service({})
        namespace N {
          @test
          union Foo {
            "bar",
            Baz,
            string,
          }

          enum Baz {
            test,
            foo,
          }

          op test(@body test: Foo): void;
        }
      `,
    )) as { Foo: Union };

    const unionType = getClientType(runner.context, Foo);

    strictEqual(unionType.kind, "union");
    strictEqual(unionType.name, "Foo");
    strictEqual(unionType.isGeneratedName, false);
    strictEqual(unionType.crossLanguageDefinitionId, "N.Foo");
  });

  it("nullable union as enum with hierarchy without flatten", async () => {
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
      `,
    )) as { Test: Union };

    const nullableType = getClientType(runner.context, Test);
    strictEqual(nullableType.kind, "nullable");
    const unionType = nullableType.type;

    strictEqual(unionType.kind, "union");
    strictEqual(unionType.name, "Test");
    strictEqual(unionType.isGeneratedName, true);
    strictEqual(unionType.crossLanguageDefinitionId, "N.Test");

    const variants = unionType.variantTypes;
    strictEqual(variants.length, 3);
    const a = variants[0] as SdkEnumType;
    strictEqual(a.kind, "enum");
    strictEqual(a.name, "A");
    strictEqual(a.isGeneratedName, false);
    strictEqual(a.crossLanguageDefinitionId, "N.A");
    strictEqual(a.isUnionAsEnum, true);
    strictEqual(a.values[0].name, "A1");
    strictEqual(a.values[0].value, "A1");
    strictEqual(a.values[1].name, "A2");
    strictEqual(a.values[1].value, "A2");

    const b = variants[1] as SdkEnumType;
    strictEqual(b.kind, "enum");
    strictEqual(b.name, "B");
    strictEqual(b.isGeneratedName, false);
    strictEqual(b.crossLanguageDefinitionId, "N.B");
    strictEqual(b.isUnionAsEnum, true);
    strictEqual(b.values[0].name, "B");
    strictEqual(b.values[0].value, "B");

    const c = variants[2] as SdkEnumType;
    strictEqual(c.kind, "enum");
    strictEqual(c.name, "C");
    strictEqual(c.isGeneratedName, false);
    strictEqual(c.crossLanguageDefinitionId, "N.C");
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
      `,
    )) as { Test: Model };

    const modelType = getClientType(runner.context, Test) as SdkModelType;
    const enumType = modelType.properties[0].type as SdkEnumType;
    strictEqual(enumType.name, "TestColor");
    strictEqual(enumType.crossLanguageDefinitionId, "N.Test.color.anonymous");
    strictEqual(enumType.isGeneratedName, true);
    strictEqual(enumType.isUnionAsEnum, true);
    // no cross language def id bc it's not a defined object in tsp
    strictEqual(enumType.crossLanguageDefinitionId, "N.Test.color.anonymous");
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
      `,
    )) as { Test: Model };

    const modelType = getClientType(runner.context, Test) as SdkModelType;
    const unionType = modelType.properties[0].type as SdkUnionType;
    strictEqual(unionType.name, "TestColor");
    strictEqual(unionType.crossLanguageDefinitionId, "N.Test.color.anonymous");
    strictEqual(unionType.isGeneratedName, true);
    const variants = unionType.variantTypes;
    const lr = variants[0] as SdkEnumType;
    strictEqual(lr.name, "LR");
    strictEqual(lr.crossLanguageDefinitionId, "N.LR");
    strictEqual(lr.isUnionAsEnum, false);
    strictEqual(lr.values[0].name, "left");
    strictEqual(lr.values[1].name, "right");
    strictEqual(lr.isFixed, true);
    const ud = variants[1] as SdkEnumType;
    strictEqual(ud.name, "UD");
    strictEqual(ud.crossLanguageDefinitionId, "N.UD");
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
      `,
    );
    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 1);
    strictEqual(enums[0].name, "Versions");
    strictEqual(enums[0].crossLanguageDefinitionId, "DemoService.Versions");
    strictEqual(enums[0].usage, UsageFlags.ApiVersionEnum);
    deepStrictEqual(
      enums[0].values.map((x) => x.value),
      ["v1", "v2"],
    );
  });

  it("versioned enums with all", async () => {
    runner = await createSdkTestRunner({
      "api-version": "all",
      emitterName: "@azure-tools/typespec-python",
    });

    await runner.compile(
      `
        @versioned(Versions)
        @service()
        namespace DemoService;

        enum Versions {
          v1,
          v2,
        }
      `,
    );
    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 1);
    strictEqual(enums[0].name, "Versions");
    strictEqual(enums[0].crossLanguageDefinitionId, "DemoService.Versions");
    strictEqual(enums[0].usage, UsageFlags.ApiVersionEnum);
    deepStrictEqual(
      enums[0].values.map((x) => x.value),
      ["v1", "v2"],
    );
  });

  it("versioned enums with latest", async () => {
    runner = await createSdkTestRunner({
      "api-version": "latest",
      emitterName: "@azure-tools/typespec-python",
    });

    await runner.compile(
      `
        @versioned(Versions)
        @service()
        namespace DemoService;

        enum Versions {
          v1,
          v2,
        }
      `,
    );
    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 1);
    strictEqual(enums[0].name, "Versions");
    strictEqual(enums[0].crossLanguageDefinitionId, "DemoService.Versions");
    strictEqual(enums[0].usage, UsageFlags.ApiVersionEnum);
    deepStrictEqual(
      enums[0].values.map((x) => x.value),
      ["v1", "v2"],
    );
  });

  it("versioned enums with specific version", async () => {
    runner = await createSdkTestRunner({
      "api-version": "v1",
      emitterName: "@azure-tools/typespec-python",
    });

    await runner.compile(
      `
        @versioned(Versions)
        @service()
        namespace DemoService;

        enum Versions {
          v1,
          v2,
        }
      `,
    );
    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 1);
    strictEqual(enums[0].name, "Versions");
    strictEqual(enums[0].crossLanguageDefinitionId, "DemoService.Versions");
    strictEqual(enums[0].usage, UsageFlags.ApiVersionEnum);
    deepStrictEqual(
      enums[0].values.map((x) => x.value),
      ["v1"],
    );
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
      `,
    );
    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 2);
    strictEqual(enums[0].name, "LR");
    strictEqual(enums[0].crossLanguageDefinitionId, "N.LR");
    strictEqual(enums[0].usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(enums[1].name, "UD");
    strictEqual(enums[1].crossLanguageDefinitionId, "N.UD");
    strictEqual(enums[1].usage, UsageFlags.Input | UsageFlags.Json);
  });

  it("spread and union as enum", async () => {
    await runner.compile(
      `
        @service({})
        namespace N {
          union StringExtensibleNamedUnion {
            string,
            OptionB: "b",
            "c",
          }

          model Test { name: string; }
          op read(prop1: StringExtensibleNamedUnion; prop2: Test): void;
        }
      `,
    );
    const enums = runner.context.sdkPackage.enums;
    strictEqual(enums.length, 1);
    strictEqual(enums[0].access, "public");
    strictEqual(enums[0].usage, UsageFlags.Input | UsageFlags.Json);
    const models = runner.context.sdkPackage.models;
    const testModel = models.find((x) => x.name === "Test");
    ok(testModel);
    strictEqual(testModel.access, "public");
    strictEqual(testModel.usage, UsageFlags.Input | UsageFlags.Json);
  });
});
