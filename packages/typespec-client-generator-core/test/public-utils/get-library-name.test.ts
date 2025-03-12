import { Model, ModelProperty, Operation } from "@typespec/compiler";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getLibraryName } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
it("operation client projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { func } = (await runner.compile(`
      @test @clientName("rightName") op func(@query("api-version") myApiVersion: string): void;
    `)) as { func: Operation };
    strictEqual(getLibraryName(runner.context, func), "rightName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("operation language projected name", async () => {
  async function helper(emitterName: string, expected: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { func } = (await runner.compile(`
      @test
      @clientName("madeForCS", "csharp")
      @clientName("madeForJava", "java")
      @clientName("madeForTS", "javascript")
      @clientName("made_for_python", "python")
      op func(@query("api-version") myApiVersion: string): void;
    `)) as { func: Operation };
    strictEqual(getLibraryName(runner.context, func), expected);
  }
  await helper("@azure-tools/typespec-csharp", "madeForCS");
  await helper("@azure-tools/typespec-java", "madeForJava");
  await helper("@azure-tools/typespec-ts", "madeForTS");
  await helper("@azure-tools/typespec-python", "made_for_python");
});
it("operation language projected name augmented", async () => {
  async function helper(emitterName: string, expected: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { func } = (await runner.compile(`
      @test
      op func(@query("api-version") myApiVersion: string): void;

      @@clientName(func, "madeForCS", "csharp");
      @@clientName(func, "madeForJava", "java");
      @@clientName(func, "madeForTS", "javascript");
      @@clientName(func, "made_for_python", "python");
    `)) as { func: Operation };
    strictEqual(getLibraryName(runner.context, func), expected);
  }
  await helper("@azure-tools/typespec-csharp", "madeForCS");
  await helper("@azure-tools/typespec-java", "madeForJava");
  await helper("@azure-tools/typespec-ts", "madeForTS");
  await helper("@azure-tools/typespec-python", "made_for_python");
});
it("operation json projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { func } = (await runner.compile(`
      @test
      @encodedName("application/json", "NotToUseMeAsName") // Should be ignored
      op func(@query("api-version") myApiVersion: string): void;
    `)) as { func: Operation };
    strictEqual(getLibraryName(runner.context, func), "func");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("operation no projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { func } = (await runner.compile(`
      @test
      op func(@query("api-version") myApiVersion: string): void;
    `)) as { func: Operation };
    strictEqual(getLibraryName(runner.context, func), "func");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("model client projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      @clientName("RightName")
      model MyModel {
        prop: string
      }
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), "RightName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("model language projected name", async () => {
  async function helper(emitterName: string, expected: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      @clientName("CsharpModel", "csharp")
      @clientName("JavaModel", "java")
      @clientName("JavascriptModel", "javascript")
      @clientName("PythonModel", "python")
      model MyModel {
        prop: string
      }
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), expected);
  }
  await helper("@azure-tools/typespec-csharp", "CsharpModel");
  await helper("@azure-tools/typespec-java", "JavaModel");
  await helper("@azure-tools/typespec-ts", "JavascriptModel");
  await helper("@azure-tools/typespec-python", "PythonModel");
});
it("model language projected name augmented", async () => {
  async function helper(emitterName: string, expected: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        prop: string
      }

      @@clientName(MyModel, "CsharpModel", "csharp");
      @@clientName(MyModel, "JavaModel", "java");
      @@clientName(MyModel, "JavascriptModel", "javascript");
      @@clientName(MyModel, "PythonModel", "python");
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), expected);
  }
  await helper("@azure-tools/typespec-csharp", "CsharpModel");
  await helper("@azure-tools/typespec-java", "JavaModel");
  await helper("@azure-tools/typespec-ts", "JavascriptModel");
  await helper("@azure-tools/typespec-python", "PythonModel");
});
it("model json projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      @encodedName("application/json", "NotToUseMeAsName") // Should be ignored
      model MyModel {
        prop: string
      }
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), "MyModel");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("model no projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        prop: string
      }
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), "MyModel");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("model friendly name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      @friendlyName("FriendlyName")
      model MyModel {
        prop: string
      }
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), "FriendlyName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("model friendly name augmented", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      model MyModel {
        prop: string
      }
      @@friendlyName(MyModel, "FriendlyName");
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), "FriendlyName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});

it("should return language specific name when both language specific name and friendly name exist", async () => {
  async function helper(expected: string, emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      @friendlyName("FriendlyName")
      @clientName("CsharpModel", "csharp")
      @clientName("JavaModel", "java")
      @clientName("JavascriptModel", "javascript")
      @clientName("PythonModel", "python")
      model MyModel {
        prop: string
      }
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), expected);
  }
  await helper("CsharpModel", "@azure-tools/typespec-csharp");
  await helper("JavaModel", "@azure-tools/typespec-java");
  await helper("JavascriptModel", "@azure-tools/typespec-ts");
  await helper("PythonModel", "@azure-tools/typespec-python");
});

it("should return client name when both client name and friendly name exist", async () => {
  async function helper(expected: string, emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { MyModel } = (await runner.compile(`
      @test
      @friendlyName("FriendlyName")
      @clientName("clientName")
      model MyModel {
        prop: string
      }
    `)) as { MyModel: Model };
    strictEqual(getLibraryName(runner.context, MyModel), expected);
  }
  await helper("clientName", "@azure-tools/typespec-csharp");
  await helper("clientName", "@azure-tools/typespec-java");
  await helper("clientName", "@azure-tools/typespec-ts");
  await helper("clientName", "@azure-tools/typespec-python");
});

it("parameter client projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { param } = (await runner.compile(`
      op func(
        @test
        @clientName("rightName")
        @query("param")
        param: string
      ): void;
    `)) as { param: ModelProperty };
    strictEqual(getLibraryName(runner.context, param), "rightName");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("parameter language projected name", async () => {
  async function helper(emitterName: string, expected: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { param } = (await runner.compile(`
      op func(
        @test
        @clientName("csharpParam", "csharp")
        @clientName("javaParam", "java")
        @clientName("javascriptParam", "javascript")
        @clientName("python_param", "python")
        @query("param")
        param: string
      ): void;
    `)) as { param: ModelProperty };
    strictEqual(getLibraryName(runner.context, param), expected);
  }
  await helper("@azure-tools/typespec-csharp", "csharpParam");
  await helper("@azure-tools/typespec-java", "javaParam");
  await helper("@azure-tools/typespec-ts", "javascriptParam");
  await helper("@azure-tools/typespec-python", "python_param");
});

it("parameter json projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { param } = (await runner.compile(`
      op func(
        @test
        @encodedName("application/json", "ShouldBeIgnored")
        @query("param")
        param: string
      ): void;
    `)) as { param: ModelProperty };
    strictEqual(getLibraryName(runner.context, param), "param");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("parameter no projected name", async () => {
  async function helper(emitterName: string) {
    const runner = await createSdkTestRunner({ emitterName });
    const { param } = (await runner.compile(`
      op func(
        @test
        @query("param")
        param: string
      ): void;
    `)) as { param: ModelProperty };
    strictEqual(getLibraryName(runner.context, param), "param");
  }
  await helper("@azure-tools/typespec-csharp");
  await helper("@azure-tools/typespec-java");
  await helper("@azure-tools/typespec-ts");
  await helper("@azure-tools/typespec-python");
});
it("template without @friendlyName renaming", async () => {
  await runner.compileWithBuiltInService(`
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
  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models.filter((x) => x.name === "ResourceOperationStatusUser")[0];
  ok(model);
});

it("template without @friendlyName renaming for union as enum", async () => {
  await runner.compileWithBuiltInService(`
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
  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 2);
  const model = models.filter(
    (x) => x.name === "RelationshipOriginInformationDependencyOfOrigins",
  )[0];
  ok(model);
});
