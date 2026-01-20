import { t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { getLibraryName } from "../../src/public-utils.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

it("operation client projected name", async () => {
  async function helper(emitterName: string) {
    const { program, func } = await SimpleTester.compile(t.code`
      @clientName("rightName") op ${t.op("func")}(@query("api-version") myApiVersion: string): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, func), "rightName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("operation language projected name", async () => {
  async function helper(emitterName: string, expected: string) {
    const { program, func } = await SimpleTester.compile(t.code`
      @clientName("madeForCS", "csharp")
      @clientName("madeForJava", "java")
      @clientName("madeForTS", "javascript")
      @clientName("made_for_python", "python")
      op ${t.op("func")}(@query("api-version") myApiVersion: string): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, func), expected);
  }
  await helper("@azure-tools/typespec-csharp", "madeForCS");
  await helper("@azure-tools/typespec-java", "madeForJava");
  await helper("@azure-tools/typespec-ts", "madeForTS");
  await helper("@azure-tools/typespec-python", "made_for_python");
});

it("operation language projected name augmented", async () => {
  async function helper(emitterName: string, expected: string) {
    const { program, func } = await SimpleTester.compile(t.code`
      op ${t.op("func")}(@query("api-version") myApiVersion: string): void;

      @@clientName(func, "madeForCS", "csharp");
      @@clientName(func, "madeForJava", "java");
      @@clientName(func, "madeForTS", "javascript");
      @@clientName(func, "made_for_python", "python");
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, func), expected);
  }
  await helper("@azure-tools/typespec-csharp", "madeForCS");
  await helper("@azure-tools/typespec-java", "madeForJava");
  await helper("@azure-tools/typespec-ts", "madeForTS");
  await helper("@azure-tools/typespec-python", "made_for_python");
});

it("operation json projected name", async () => {
  async function helper(emitterName: string) {
    const { program, func } = await SimpleTester.compile(t.code`
      @encodedName("application/json", "NotToUseMeAsName") // Should be ignored
      op ${t.op("func")}(@query("api-version") myApiVersion: string): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, func), "func");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("operation no projected name", async () => {
  async function helper(emitterName: string) {
    const { program, func } = await SimpleTester.compile(t.code`
      op ${t.op("func")}(@query("api-version") myApiVersion: string): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, func), "func");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("model client projected name", async () => {
  async function helper(emitterName: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      @clientName("RightName")
      model ${t.model("MyModel")} {
        prop: string
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), "RightName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("model language projected name", async () => {
  async function helper(emitterName: string, expected: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      @clientName("CsharpModel", "csharp")
      @clientName("JavaModel", "java")
      @clientName("JavascriptModel", "javascript")
      @clientName("PythonModel", "python")
      model ${t.model("MyModel")} {
        prop: string
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), expected);
  }
  await helper("@azure-tools/typespec-csharp", "CsharpModel");
  await helper("@azure-tools/typespec-java", "JavaModel");
  await helper("@azure-tools/typespec-ts", "JavascriptModel");
  await helper("@azure-tools/typespec-python", "PythonModel");
});

it("model language projected name augmented", async () => {
  async function helper(emitterName: string, expected: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      model ${t.model("MyModel")} {
        prop: string
      }

      @@clientName(MyModel, "CsharpModel", "csharp");
      @@clientName(MyModel, "JavaModel", "java");
      @@clientName(MyModel, "JavascriptModel", "javascript");
      @@clientName(MyModel, "PythonModel", "python");
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), expected);
  }
  await helper("@azure-tools/typespec-csharp", "CsharpModel");
  await helper("@azure-tools/typespec-java", "JavaModel");
  await helper("@azure-tools/typespec-ts", "JavascriptModel");
  await helper("@azure-tools/typespec-python", "PythonModel");
});

it("model json projected name", async () => {
  async function helper(emitterName: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      @encodedName("application/json", "NotToUseMeAsName") // Should be ignored
      model ${t.model("MyModel")} {
        prop: string
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), "MyModel");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("model no projected name", async () => {
  async function helper(emitterName: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      model ${t.model("MyModel")} {
        prop: string
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), "MyModel");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("model friendly name", async () => {
  async function helper(emitterName: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      @friendlyName("FriendlyName")
      model ${t.model("MyModel")} {
        prop: string
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), "FriendlyName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("model friendly name augmented", async () => {
  async function helper(emitterName: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      model ${t.model("MyModel")} {
        prop: string
      }
      @@friendlyName(MyModel, "FriendlyName");
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), "FriendlyName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("should return language specific name when both language specific name and friendly name exist", async () => {
  async function helper(expected: string, emitterName: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      @friendlyName("FriendlyName")
      @clientName("CsharpModel", "csharp")
      @clientName("JavaModel", "java")
      @clientName("JavascriptModel", "javascript")
      @clientName("PythonModel", "python")
      model ${t.model("MyModel")} {
        prop: string
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), expected);
  }
  await helper("CsharpModel", "@azure-tools/typespec-csharp");
  await helper("JavaModel", "@azure-tools/typespec-java");
  await helper("JavascriptModel", "@azure-tools/typespec-ts");
  await helper("PythonModel", "@azure-tools/typespec-python");
});

it("should return client name when both client name and friendly name exist", async () => {
  async function helper(expected: string, emitterName: string) {
    const { program, MyModel } = await SimpleTester.compile(t.code`
      @friendlyName("FriendlyName")
      @clientName("clientName")
      model ${t.model("MyModel")} {
        prop: string
      }
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, MyModel), expected);
  }
  await helper("clientName", "@azure-tools/typespec-csharp");
  await helper("clientName", "@azure-tools/typespec-java");
  await helper("clientName", "@azure-tools/typespec-ts");
  await helper("clientName", "@azure-tools/typespec-python");
});

it("parameter client projected name", async () => {
  async function helper(emitterName: string) {
    const { program, param } = await SimpleTester.compile(t.code`
      op func(
        @clientName("rightName")
        @query("param")
        ${t.modelProperty("param")}: string
      ): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, param), "rightName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("parameter language projected name", async () => {
  async function helper(emitterName: string, expected: string) {
    const { program, param } = await SimpleTester.compile(t.code`
      op func(
        @clientName("csharpParam", "csharp")
        @clientName("javaParam", "java")
        @clientName("javascriptParam", "javascript")
        @clientName("python_param", "python")
        @query("param")
        ${t.modelProperty("param")}: string
      ): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, param), expected);
  }
  await helper("@azure-tools/typespec-csharp", "csharpParam");
  await helper("@azure-tools/typespec-java", "javaParam");
  await helper("@azure-tools/typespec-ts", "javascriptParam");
  await helper("@azure-tools/typespec-python", "python_param");
});

it("parameter json projected name", async () => {
  async function helper(emitterName: string) {
    const { program, param } = await SimpleTester.compile(t.code`
      op func(
        @encodedName("application/json", "ShouldBeIgnored")
        @query("param")
        ${t.modelProperty("param")}: string
      ): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, param), "param");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("parameter no projected name", async () => {
  async function helper(emitterName: string) {
    const { program, param } = await SimpleTester.compile(t.code`
      op func(
        @query("param")
        ${t.modelProperty("param")}: string
      ): void;
    `);
    const context = await createSdkContextForTester(program, { emitterName });
    strictEqual(getLibraryName(context, param), "param");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("template without @friendlyName renaming", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    op GetResourceOperationStatus<
      Resource extends TypeSpec.Reflection.Model
    >(): ResourceOperationStatus<Resource>;
    
    model ResourceOperationStatus<Resource extends TypeSpec.Reflection.Model> {
      status: string;
      resource: Resource;
    }

    model User {
      id: string;
    }

    op getStatus is GetResourceOperationStatus<User>;
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models.filter((x) => x.name === "ResourceOperationStatusUser")[0];
  ok(model);
});

it("template without @friendlyName renaming for union as enum", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    union DependencyOfOrigins {
      serviceExplicitlyCreated: "ServiceExplicitlyCreated",
      userExplicitlyCreated: "UserExplicitlyCreated",
      string,
    }

    model DependencyOfRelationshipProperties
      is BaseRelationshipProperties<DependencyOfOrigins>;

    model BaseRelationshipProperties<TOrigin> {
      originInformation: RelationshipOriginInformation<TOrigin>;
    }

    model RelationshipOriginInformation<TOrigin = string> {
      relationshipOriginType: TOrigin;
    }

    op test(): DependencyOfRelationshipProperties;
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models.filter(
    (x) => x.name === "RelationshipOriginInformationDependencyOfOrigins",
  )[0];
  ok(model);
});

it("template without @friendlyName renaming with naming conflict", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model Test<T> {
      prop: T;
    }

    model Instance {
      stringModel: Test<string>;
      int32Model: Test<int32>;
      booleanModel: Test<boolean>;
    }

    op test(): Instance;
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 4);
  const model = models.filter((x) => x.name === "Instance")[0];
  ok(model);
  strictEqual(model.properties.length, 3);
  strictEqual(model.properties[0].type.kind, "model");
  strictEqual(model.properties[0].type.name, "Test");
  strictEqual(model.properties[1].type.kind, "model");
  strictEqual(model.properties[1].type.name, "Test1");
  strictEqual(model.properties[2].type.kind, "model");
  strictEqual(model.properties[2].type.name, "Test2");
});
