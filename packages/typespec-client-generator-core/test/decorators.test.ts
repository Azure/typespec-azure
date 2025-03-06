import { Interface, Model, Operation } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  getAccess,
  getClient,
  getClientNameOverride,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldGenerateConvenient,
  shouldGenerateProtocol,
} from "../src/decorators.js";
import {
  SdkClientType,
  SdkHttpOperation,
  SdkMethodResponse,
  UsageFlags,
} from "../src/interfaces.js";
import { getAllModels } from "../src/types.js";
import { SdkTestRunner, createSdkContextTestHelper, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: decorators", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  async function protocolAPITestHelper(
    runner: SdkTestRunner,
    protocolValue: boolean,
    globalValue: boolean,
  ): Promise<void> {
    const testCode = `
          @protocolAPI(${protocolValue})
          @test
          op test(): void;
        `;
    const { test } = await runner.compileWithBuiltInService(testCode);

    const actual = shouldGenerateProtocol(
      await createSdkContextTestHelper(runner.context.program, {
        generateProtocolMethods: globalValue,
        generateConvenienceMethods: false,
      }),
      test as Operation,
    );

    const method = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "test");
    strictEqual(method.kind, "basic");
    strictEqual(actual, protocolValue);
    strictEqual(method.generateProtocol, protocolValue);
  }
  describe("@protocolAPI", () => {
    it("generateProtocolMethodsTrue, operation marked protocolAPI true", async () => {
      await protocolAPITestHelper(runner, true, true);
    });
    it("generateProtocolMethodsTrue, operation marked protocolAPI false", async () => {
      await protocolAPITestHelper(runner, false, true);
    });
    it("generateProtocolMethodsFalse, operation marked protocolAPI true", async () => {
      await protocolAPITestHelper(runner, true, false);
    });
    it("generateProtocolMethodsFalse, operation marked protocolAPI false", async () => {
      await protocolAPITestHelper(runner, false, false);
    });
  });

  async function convenientAPITestHelper(
    runner: SdkTestRunner,
    convenientValue: boolean,
    globalValue: boolean,
  ): Promise<void> {
    const testCode = `
          @convenientAPI(${convenientValue})
          @test
          op test(): void;
        `;
    const { test } = await runner.compileWithBuiltInService(testCode);

    const actual = shouldGenerateConvenient(
      await createSdkContextTestHelper(runner.program, {
        generateProtocolMethods: false,
        generateConvenienceMethods: globalValue,
      }),
      test as Operation,
    );
    strictEqual(actual, convenientValue);

    const method = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "test");
    strictEqual(method.kind, "basic");
    strictEqual(method.generateConvenient, convenientValue);
  }

  describe("@convenientAPI", () => {
    it("generateConvenienceMethodsTrue, operation marked convenientAPI true", async () => {
      await convenientAPITestHelper(runner, true, true);
    });
    it("generateConvenienceMethodsTrue, operation marked convenientAPI false", async () => {
      await convenientAPITestHelper(runner, false, true);
    });
    it("generateConvenienceMethodsFalse, operation marked convenientAPI true", async () => {
      await convenientAPITestHelper(runner, true, false);
    });
    it("generateConvenienceMethodsFalse, operation marked convenientAPI false", async () => {
      await convenientAPITestHelper(runner, false, false);
    });

    it("mark an operation as convenientAPI default, pass in sdkContext with generateConvenienceMethods false", async () => {
      const { test } = await runner.compileWithBuiltInService(`
        @convenientAPI
        @test
        op test(): void;
      `);

      const actual = shouldGenerateConvenient(
        await createSdkContextTestHelper(runner.program, {
          generateProtocolMethods: false,
          generateConvenienceMethods: false,
        }),
        test as Operation,
      );
      strictEqual(actual, true);
      const method = runner.context.sdkPackage.clients[0].methods[0];
      strictEqual(method.name, "test");
      strictEqual(method.kind, "basic");
      strictEqual(method.generateConvenient, true);
    });
  });

  describe("@protocolAPI and @convenientAPI with scope", () => {
    it("mark an operation as protocolAPI false for csharp and convenientAPI false for java, pass in default sdkContext", async () => {
      const testCode = `
        @protocolAPI(false, "csharp")
        @convenientAPI(false, "java")
        @test
        op test(): void;
      `;

      // java should get protocolAPI=true and convenientAPI=false
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });

        const { test } = (await runner.compileWithBuiltInService(testCode)) as { test: Operation };

        const method = runner.context.sdkPackage.clients[0].methods[0];
        strictEqual(method.name, "test");
        strictEqual(method.kind, "basic");

        strictEqual(shouldGenerateProtocol(runner.context, test), true);
        strictEqual(method.generateProtocol, true);

        strictEqual(
          shouldGenerateConvenient(runner.context, test),
          false,
          "convenientAPI should be false for java",
        );
        strictEqual(method.generateConvenient, false, "convenientAPI should be false for java");
      }

      // csharp should get protocolAPI=false and convenientAPI=true
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        const { test } = (await runner.compileWithBuiltInService(testCode)) as { test: Operation };
        const method = runner.context.sdkPackage.clients[0].methods[0];
        strictEqual(method.name, "test");
        strictEqual(method.kind, "basic");

        strictEqual(
          shouldGenerateProtocol(runner.context, test),
          false,
          "protocolAPI should be false for csharp",
        );
        strictEqual(method.generateProtocol, false, "protocolAPI should be false for csharp");

        strictEqual(shouldGenerateConvenient(runner.context, test), true);
        strictEqual(method.generateConvenient, true);
      }
    });
  });

  describe("scope", () => {
    it("emitter with same scope as decorator", async () => {
      runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      const { func } = (await runner.compile(`
        @test
        @access(Access.internal, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `)) as { func: Operation };

      const actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("emitter different scope from decorator", async () => {
      const code = `
      @test
      @access(Access.internal, "csharp")
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
    `;
      const { func } = (await runner.compile(code)) as { func: Operation };
      strictEqual(getAccess(runner.context, func), "public");

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
    });

    it("emitter first in decorator scope list", async () => {
      runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const { func } = (await runner.compile(`
        @test
        @access(Access.internal, "java")
        @access(Access.internal, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `)) as { func: Operation };

      const actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("emitter second in decorator scope list", async () => {
      runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      const { func } = (await runner.compile(`
        @test
        @access(Access.internal, "java")
        @access(Access.internal, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `)) as { func: Operation };

      const actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("emitter excluded from decorator scope list", async () => {
      const code = `
      @test
      @access(Access.internal, "java")
      @access(Access.internal, "csharp")
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
    `;
      const { func } = (await runner.compile(code)) as { func: Operation };

      strictEqual(getAccess(runner.context, func), "public");
      const runnerWithJava = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-java",
      });
      const { func: funcJava } = (await runnerWithJava.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithJava.context, funcJava), "internal");
    });

    it("first non-scoped decorator then scoped decorator", async () => {
      const code = `
        @test
        @access(Access.public, "csharp")
        @access(Access.internal)
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `;

      const { func } = (await runner.compile(code)) as { func: Operation };
      strictEqual(getAccess(runner.context, func), "internal");

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "public");
    });

    it("first scoped decorator then non-scoped decorator", async () => {
      const code = `
        @test
        @access(Access.internal)
        @access(Access.public, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `;

      const { func } = (await runner.compile(code)) as { func: Operation };
      strictEqual(getAccess(runner.context, func), "internal");

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
    });

    it("first non-scoped augmented decorator then scoped augmented decorator", async () => {
      const code = `
        @test
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;

        @@access(func, Access.public);
        @@access(func, Access.internal, "csharp"); 
      `;

      const { func } = (await runner.compile(code)) as { func: Operation };
      strictEqual(getAccess(runner.context, func), "public");

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
    });

    it("first scoped augmented decorator then non-scoped augmented decorator", async () => {
      const code = `
        @test
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;

        @@access(func, Access.internal, "csharp");
        @@access(func, Access.public);
      `;

      const { func } = (await runner.compile(code)) as { func: Operation };
      strictEqual(getAccess(runner.context, func), "public");

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "public");
    });

    it("two scoped decorator", async () => {
      const code = `
        @test
        @access(Access.internal, "csharp")
        @access(Access.internal, "python")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `;

      const { func } = (await runner.compile(code)) as { func: Operation };
      strictEqual(getAccess(runner.context, func), "internal");

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
    });

    it("csv scope list", async () => {
      function getCodeTemplate(language: string) {
        return `
          @test
          @access(Access.internal, "${language}")
          model Test {
            prop: string;
          }
          `;
      }
      const pythonRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });
      const javaRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const csharpRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });

      const testCode = getCodeTemplate("python,csharp");
      const { Test: TestPython } = (await pythonRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(pythonRunner.context, TestPython), "internal");

      const { Test: TestCSharp } = (await csharpRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(csharpRunner.context, TestCSharp), "internal");

      const { Test: TestJava } = (await javaRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(javaRunner.context, TestJava), "public");
    });

    it("csv scope list augment", async () => {
      function getCodeTemplate(language: string) {
        return `
          @test
          model Test {
            prop: string;
          }

          @@access(Test, Access.public, "java, ts");
          @@access(Test, Access.internal, "${language}");
          `;
      }
      const pythonRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });
      const javaRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const csharpRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });

      const testCode = getCodeTemplate("python,csharp");
      const { Test: TestPython } = (await pythonRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(pythonRunner.context, TestPython), "internal");

      const { Test: TestCSharp } = (await csharpRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(csharpRunner.context, TestCSharp), "internal");

      const { Test: TestJava } = (await javaRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(javaRunner.context, TestJava), "public");
    });
  });

  describe("@flattenProperty", () => {
    it("marks a model property to be flattened with suppression of deprecation warning", async () => {
      await runner.compileWithBuiltInService(`
        model Model1{
          #suppress "deprecated" "@flattenProperty decorator is not recommended to use."
          @flattenProperty
          child: Model2;
        }

        @test
        model Model2{}

        @test
        @route("/func1")
        op func1(@body body: Model1): void;
      `);
      const models = getAllModels(runner.context);
      strictEqual(models.length, 2);
      const model1 = models.find((x) => x.name === "Model1")!;
      strictEqual(model1.kind, "model");
      strictEqual(model1.properties.length, 1);
      const childProperty = model1.properties[0];
      strictEqual(childProperty.kind, "property");
      strictEqual(childProperty.flatten, true);
    });

    it("doesn't mark a un-flattened model property", async () => {
      await runner.compile(`
        @service
        @test namespace MyService {
          @test
          model Model1{
            child: Model2;
          }

          @test
          model Model2{}

          @test
          @route("/func1")
          op func1(@body body: Model1): void;
        }
      `);
      const models = getAllModels(runner.context);
      strictEqual(models.length, 2);
      const model1 = models.find((x) => x.name === "Model1")!;
      strictEqual(model1.kind, "model");
      strictEqual(model1.properties.length, 1);
      const childProperty = model1.properties[0];
      strictEqual(childProperty.kind, "property");
      strictEqual(childProperty.flatten, false);
    });

    it("throws deprecation warning if not suppressed", async () => {
      const diagnostics = await runner.diagnose(`
        @service
        @test namespace MyService {
          @test
          model Model1{
            @flattenProperty
            child: Model2;
          }

          @test
          model Model2{}

          @test
          @route("/func1")
          op func1(@body body: Model1): void;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "deprecated",
      });
    });

    it("throws error when used on other targets", async () => {
      const diagnostics = await runner.diagnose(`
        @service
        @test namespace MyService {
          @test
          @flattenProperty
          model Model1{
            child: Model2;
          }

          @test
          model Model2{}

          @test
          @route("/func1")
          op func1(@body body: Model1): void;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "decorator-wrong-target",
      });
    });

    it("throws error when used on a polymorphism type", async () => {
      const diagnostics = await runner.diagnose(`
        @service
        @test namespace MyService {
          #suppress "deprecated" "@flattenProperty decorator is not recommended to use."
          @test
          model Model1{
            @flattenProperty
            child: Model2;
          }

          @test
          @discriminator("kind")
          model Model2{
            kind: string;
          }
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/flatten-polymorphism",
      });
    });
  });

  describe("@clientName", () => {
    it("carry over", async () => {
      const { Test1, Test2, func1, func2 } = (await runner.compile(`
        @service
        @test namespace MyService {
          @test
          @clientName("Test1Rename")
          model Test1{}

          @test
          model Test2 is Test1{}

          @test
          @route("/func1")
          @clientName("func1Rename")
          op func1(): void;

          @test
          @route("/func2")
          op func2 is func1;
        }
      `)) as { Test1: Model; Test2: Model; func1: Operation; func2: Operation };

      strictEqual(getClientNameOverride(runner.context, Test1), "Test1Rename");
      strictEqual(getClientNameOverride(runner.context, Test2), undefined);
      strictEqual(getClientNameOverride(runner.context, func1), "func1Rename");
      strictEqual(getClientNameOverride(runner.context, func2), undefined);
    });

    it("augment carry over", async () => {
      const { Test1, Test2, func1, func2 } = (await runner.compileWithCustomization(
        `
        @service
        @test namespace MyService {
          @test
          model Test1{}

          @test
          model Test2 is Test1{}

          @test
          @route("/func1")
          op func1(): void;

          @test
          @route("/func2")
          op func2 is func1;
        }
      `,
        `
        namespace Customizations;

        @@clientName(MyService.Test1, "Test1Rename");
        @@clientName(MyService.func1, "func1Rename");
      `,
      )) as { Test1: Model; Test2: Model; func1: Operation; func2: Operation };

      strictEqual(getClientNameOverride(runner.context, Test1), "Test1Rename");
      strictEqual(getClientNameOverride(runner.context, Test2), undefined);
      strictEqual(getClientNameOverride(runner.context, func1), "func1Rename");
      strictEqual(getClientNameOverride(runner.context, func2), undefined);
    });

    it("@clientName with scope of versioning", async () => {
      const testCode = `
        @service(#{
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
        }
        
        @clientName("TestJava", "java")
        @clientName("TestCSharp", "csharp")
        model Test {}
        op test(@body body: Test): void;
      `;

      // java
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        await runner.compile(testCode);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestJava");
      }

      // csharp
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        await runner.compile(testCode);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestCSharp");
      }

      // python
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
        await runner.compile(testCode);
        strictEqual(runner.context.sdkPackage.models[0].name, "Test");
      }
    });

    it("augmented @clientName with scope of versioning", async () => {
      const testCode = `
        @service(#{
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
        }
        
        
        model Test {}
        op test(@body body: Test): void;
      `;

      const customization = `
        namespace Customizations;

        @@clientName(Contoso.WidgetManager.Test, "TestCSharp", "csharp");
        @@clientName(Contoso.WidgetManager.Test, "TestJava", "java");
      `;

      // java
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        await runner.compileWithCustomization(testCode, customization);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestJava");
      }

      // csharp
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        await runner.compileWithCustomization(testCode, customization);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestCSharp");
      }

      // python
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
        await runner.compileWithCustomization(testCode, customization);
        strictEqual(runner.context.sdkPackage.models[0].name, "Test");
      }
    });

    it("decorator on template parameter", async function () {
      await runner.compileAndDiagnose(`
        @service
        namespace MyService;
        
        model ResourceBody<Resource> {
          @body
          resource: Resource;
        }
        
        @post
        op do<Resource extends {}>(...ResourceBody<Resource>): void;
        
        @@clientName(ResourceBody.resource, "body");
        
        model Test {
          id: string;
          prop: string;
        }
        
        op test is do<Test>;
        
      `);

      strictEqual(runner.context.sdkPackage.clients[0].methods[0].parameters[0].name, "body");
    });

    it("empty client name", async () => {
      const diagnostics = await runner.diagnose(`
        @service
        namespace MyService;
        
        @clientName(" ")
        model Test {
          id: string;
          prop: string;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/empty-client-name",
      });
    });

    it("duplicate model client name with a random language scope", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
      
      @clientName("Test", "random")
      model Widget {
        @key
        id: int32;
      }

      model Test {
        prop1: string;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Test" is duplicated in language scope: "random"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Test" is defined somewhere causing nameing conflicts in language scope: "random"',
        },
      ]);
    });

    it("duplicate model, enum, union client name with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
        
      @clientName("B")
      enum A {
        one
      }

      model B {}

      @clientName("B")
      union C {}
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate operation with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
        
      @clientName("b")
      @route("/a")
      op a(): void;

      @route("/b")
      op b(): void;
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate operation in interface with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
      
      interface C {
        @clientName("b")
        @route("/a")
        op a(): void;

        @route("/b")
        op b(): void;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate scalar with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
        
      @clientName("b")
      scalar a extends string;

      scalar b extends string;
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate interface with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;

      @clientName("B")
      @route("/a")
      interface A {
      }

      @route("/b")
      interface B {
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate model property with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;

      model A {
        @clientName("prop2")
        prop1: string;
        prop2: string;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "prop2" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "prop2" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate enum member with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;

      enum A {
        @clientName("two")
        one,
        two
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "two" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "two" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate union variant with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        @service
        namespace Contoso.WidgetManager;

        union Foo { 
          @clientName("b")
          a: {}, 
          b: {} 
        }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate namespace with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        @service
        namespace A{
          namespace B {}
          @clientName("B")
          namespace C {}
        }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate enum and model within nested namespace for all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        @service
        namespace A{
          namespace B {
            @clientName("B")
            enum A {
              one
            }

            model B {}
          }

          @clientName("B")
          model A {}
        }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate model with model only generation for all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        model Foo {}

        @clientName("Foo")
        model Bar {}
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Foo" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Foo" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate model client name with multiple language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
      
      @clientName("Test", "csharp,python,java")
      model Widget {
        @key
        id: int32;
      }

      @clientName("Widget", "java")
      model Test {
        prop1: string;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Test" is duplicated in language scope: "csharp"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Test" is defined somewhere causing nameing conflicts in language scope: "csharp"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Test" is duplicated in language scope: "python"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Test" is defined somewhere causing nameing conflicts in language scope: "python"',
        },
      ]);
    });
  });

  describe("versioning projection", () => {
    it("basic default version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(sdkPackage.enums.length, 1);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"],
      );
    });

    it("basic latest version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "latest",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"],
      );
    });

    it("basic v3 version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "v3",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"],
      );
    });

    it("basic v2 version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "v2",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v2");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type?.kind, "model");
      strictEqual(sdkPackage.models.length, 3);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2"]);
      const name = widget?.properties.find((x) => x.name === "name");
      ok(name);
      deepStrictEqual(name.apiVersions, ["v1", "v2"]);
      strictEqual(name.optional, false);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2"]);
      const testModel = sdkPackage.models.find((x) => x.name === "Test");
      ok(testModel);
      deepStrictEqual(testModel.apiVersions, ["v2"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2"],
      );
    });

    it("basic v1 version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "v1",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
    `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v1");

      strictEqual(sdkPackage.clients[0].methods.length, 1);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1"]);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1"]);
      const name = widget?.properties.find((x) => x.name === "name");
      ok(name);
      deepStrictEqual(name.apiVersions, ["v1"]);
      strictEqual(name.optional, false);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1"],
      );
    });

    it("basic all version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "all",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
    `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2); // TODO: since Test model has no usage, we could not get it, need to fix
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      // const testModel = sdkPackage.models.find(x => x.name === "Test");
      // ok(testModel);
      // deepStrictEqual(testModel.apiVersions, ["v2"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"],
      );
    });

    it("model only used in new version", async () => {
      const tsp = `
        @service(#{
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v2023_11_01_preview: "2023-11-01-preview",
          v2023_11_01: "2023-11-01",
        }
        
        model PreviewModel {
          betaFeature: string;
        }
        
        model StableModel {
          stableFeature: string;
        }
        
        @added(Versions.v2023_11_01_preview)
        @removed(Versions.v2023_11_01)
        @route("/preview")
        op previewFunctionality(...PreviewModel): void;
        
        @route("/stable")
        op stableFunctionality(...StableModel): void;
      `;

      let runnerWithVersion = await createSdkTestRunner({
        "api-version": "2023-11-01-preview",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      strictEqual(runnerWithVersion.context.sdkPackage.clients.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.clients[0].methods.length, 2);
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[0].name,
        "previewFunctionality",
      );
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[1].name,
        "stableFunctionality",
      );
      strictEqual(runnerWithVersion.context.sdkPackage.models.length, 2);
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "PreviewModel");
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].access, "internal");
      strictEqual(runnerWithVersion.context.sdkPackage.models[1].name, "StableModel");
      strictEqual(runnerWithVersion.context.sdkPackage.models[1].access, "internal");

      runnerWithVersion = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      strictEqual(runnerWithVersion.context.sdkPackage.clients.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.clients[0].methods.length, 1);
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[0].name,
        "stableFunctionality",
      );
      strictEqual(runnerWithVersion.context.sdkPackage.models.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "StableModel");
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].access, "internal");
      strictEqual(
        runnerWithVersion.context.sdkPackage.models[0].usage,
        UsageFlags.Spread | UsageFlags.Json,
      );
    });
    it("add client", async () => {
      await runner.compile(
        `
        @service
        @versioned(Versions)
        @server(
          "{endpoint}",
          "Testserver endpoint",
          {
            endpoint: url,
          }
        )
        namespace Versioning;
        enum Versions {
          v1: "v1",
          v2: "v2",
        }
        op test(): void;

        @added(Versions.v2)
        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `,
      );
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const versioningClient = sdkPackage.clients.find((x) => x.name === "VersioningClient");
      ok(versioningClient);
      strictEqual(versioningClient.methods.length, 2);

      strictEqual(versioningClient.initialization.properties.length, 1);
      const versioningClientEndpoint = versioningClient.initialization.properties.find(
        (x) => x.kind === "endpoint",
      );
      ok(versioningClientEndpoint);
      deepStrictEqual(versioningClientEndpoint.apiVersions, ["v1", "v2"]);

      const serviceMethod = versioningClient.methods.find((x) => x.kind === "basic");
      ok(serviceMethod);
      strictEqual(serviceMethod.name, "test");
      deepStrictEqual(serviceMethod.apiVersions, ["v1", "v2"]);

      const clientAccessor = versioningClient.methods.find((x) => x.kind === "clientaccessor");
      ok(clientAccessor);
      strictEqual(clientAccessor.name, "getInterfaceV2");
      deepStrictEqual(clientAccessor.apiVersions, ["v2"]);

      const interfaceV2 = versioningClient.methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      ok(interfaceV2);
      strictEqual(interfaceV2.methods.length, 1);

      strictEqual(interfaceV2.initialization.properties.length, 1);
      const interfaceV2Endpoint = interfaceV2.initialization.properties.find(
        (x) => x.kind === "endpoint",
      );
      ok(interfaceV2Endpoint);
      deepStrictEqual(interfaceV2Endpoint.apiVersions, ["v2"]);

      strictEqual(interfaceV2.methods.length, 1);
      const test2Method = interfaceV2.methods.find((x) => x.kind === "basic");
      ok(test2Method);
      strictEqual(test2Method.name, "test2");
      deepStrictEqual(test2Method.apiVersions, ["v2"]);
    });
    it("default latest GA version with preview", async () => {
      await runner.compile(
        `
        @service
        @versioned(Versions)
        @server(
          "{endpoint}",
          "Testserver endpoint",
          {
            endpoint: url,
          }
        )
        namespace Versioning;
        enum Versions {
          v2022_10_01_preview: "2022-10-01-preview",
          v2024_10_01: "2024-10-01",
        }
        op test(): void;

        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `,
      );
      const sdkVersionsEnum = runner.context.sdkPackage.enums[0];
      strictEqual(sdkVersionsEnum.name, "Versions");
      strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
      strictEqual(sdkVersionsEnum.values.length, 1);
      strictEqual(sdkVersionsEnum.values[0].value, "2024-10-01");
    });
    it("default latest preview version with GA", async () => {
      await runner.compile(
        `
        @service
        @versioned(Versions)
        @server(
          "{endpoint}",
          "Testserver endpoint",
          {
            endpoint: url,
          }
        )
        namespace Versioning;
        enum Versions {
          v2024_10_01: "2024-10-01",
          v2024_11_01_preview: "2024-11-01-preview",
        }
        op test(): void;

        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `,
      );
      const sdkVersionsEnum = runner.context.sdkPackage.enums[0];
      strictEqual(sdkVersionsEnum.name, "Versions");
      strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
      strictEqual(sdkVersionsEnum.values.length, 2);
      strictEqual(sdkVersionsEnum.values[0].value, "2024-10-01");
      strictEqual(sdkVersionsEnum.values[1].value, "2024-11-01-preview");
    });

    it("specify api version with preview filter", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "2024-10-01",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(
        `
        @service
        @versioned(Versions)
        @server(
          "{endpoint}",
          "Testserver endpoint",
          {
            endpoint: url,
          }
        )
        namespace Versioning;
        enum Versions {
          v2023_10_01: "2023-10-01",
          v2023_11_01_preview: "2023-11-01-preview",
          v2024_10_01: "2024-10-01",
          v2024_11_01_preview: "2024-11-01-preview",
        }
        op test(): void;

        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `,
      );
      const sdkVersionsEnum = runnerWithVersion.context.sdkPackage.enums[0];
      strictEqual(sdkVersionsEnum.name, "Versions");
      strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
      strictEqual(sdkVersionsEnum.values.length, 2);
      strictEqual(sdkVersionsEnum.values[0].value, "2023-10-01");
      strictEqual(sdkVersionsEnum.values[1].value, "2024-10-01");
    });
  });

  describe("versioning impact for apis", () => {
    it("multiple clients", async () => {
      const tsp = `
        @service(#{
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
          v3,
        }
        
        @client({name: "AClient"})
        @test
        interface A {
          @route("/aa")
          op aa(): void;

          @added(Versions.v2)
          @removed(Versions.v3)
          @route("/ab")
          op ab(): void;
        }

        @client({name: "BClient"})
        @added(Versions.v2)
        @test
        interface B {
          @route("/ba")
          op ba(): void;

          @route("/bb")
          op bb(): void;
        }
      `;

      let runnerWithVersion = await createSdkTestRunner({
        "api-version": "v1",
        emitterName: "@azure-tools/typespec-python",
      });

      let { A, B } = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
      ok(getClient(runnerWithVersion.context, A));
      strictEqual(getClient(runnerWithVersion.context, B), undefined);

      let clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      let aClient = clients.find((x) => x.name === "AClient");
      ok(aClient);
      let aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
      strictEqual(aOps.length, 1);
      let aa = aOps.find((x) => x.name === "aa");
      ok(aa);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v2",
        emitterName: "@azure-tools/typespec-python",
      });

      let result = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
      A = result.A;
      B = result.B;
      ok(getClient(runnerWithVersion.context, A));
      ok(getClient(runnerWithVersion.context, B));

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 2);
      aClient = clients.find((x) => x.name === "AClient");
      ok(aClient);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
      strictEqual(aOps.length, 2);
      aa = aOps.find((x) => x.name === "aa");
      ok(aa);
      const ab = aOps.find((x) => x.name === "ab");
      ok(ab);
      let bClient = clients.find((x) => x.name === "BClient");
      ok(bClient);
      let bOps = listOperationsInOperationGroup(runnerWithVersion.context, bClient);
      strictEqual(bOps.length, 2);
      let ba = bOps.find((x) => x.name === "ba");
      ok(ba);
      let bb = bOps.find((x) => x.name === "bb");
      ok(bb);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v3",
        emitterName: "@azure-tools/typespec-python",
      });

      result = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
      A = result.A;
      B = result.B;
      ok(getClient(runnerWithVersion.context, A));
      ok(getClient(runnerWithVersion.context, B));

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 2);
      aClient = clients.find((x) => x.name === "AClient");
      ok(aClient);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
      strictEqual(aOps.length, 1);
      aa = aOps.find((x) => x.name === "aa");
      ok(aa);
      bClient = clients.find((x) => x.name === "BClient");
      ok(bClient);
      bOps = listOperationsInOperationGroup(runnerWithVersion.context, bClient);
      strictEqual(bOps.length, 2);
      ba = bOps.find((x) => x.name === "ba");
      ok(ba);
      bb = bOps.find((x) => x.name === "bb");
      ok(bb);
    });

    it("multiple operation groups", async () => {
      const tsp = `
        @service(#{
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
          v3,
        }
        
        namespace A {
          @route("/a")
          op a(): void;
        }

        @added(Versions.v2)
        @removed(Versions.v3)
        interface B {
          @route("/b")
          op b(): void;
        }
      `;

      let runnerWithVersion = await createSdkTestRunner({
        "api-version": "v1",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      let clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      let client = clients.find((x) => x.name === "WidgetManagerClient");
      ok(client);
      let ops = listOperationGroups(runnerWithVersion.context, client);
      strictEqual(ops.length, 1);
      let aOp = ops.find((x) => x.type.name === "A");
      ok(aOp);
      let aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
      strictEqual(aOps.length, 1);
      let a = aOps.find((x) => x.name === "a");
      ok(a);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v2",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      client = clients.find((x) => x.name === "WidgetManagerClient");
      ok(client);
      ops = listOperationGroups(runnerWithVersion.context, client);
      strictEqual(ops.length, 2);
      aOp = ops.find((x) => x.type.name === "A");
      ok(aOp);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
      strictEqual(aOps.length, 1);
      a = aOps.find((x) => x.name === "a");
      ok(a);
      const bOp = ops.find((x) => x.type.name === "B");
      ok(bOp);
      const bOps = listOperationsInOperationGroup(runnerWithVersion.context, bOp);
      strictEqual(bOps.length, 1);
      const b = bOps.find((x) => x.name === "b");
      ok(b);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v3",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      client = clients.find((x) => x.name === "WidgetManagerClient");
      ok(client);
      ops = listOperationGroups(runnerWithVersion.context, client);
      strictEqual(ops.length, 1);
      aOp = ops.find((x) => x.type.name === "A");
      ok(aOp);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
      strictEqual(aOps.length, 1);
      a = aOps.find((x) => x.name === "a");
      ok(a);
    });
  });

  describe("scope negation", () => {
    it("single scope negation", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "Test");
      ok(testModel);
    });

    it("multiple scopes negation", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!(csharp, java)")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "Test");
      ok(testModel);
    });

    it("non-negation scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!(python, java)")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
      ok(testModel);
    });

    it("allow combination of negation scope and normal scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "csharp, !java")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
      ok(testModel);
    });

    it("allow combination of negation scope and normal scope for the same scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp, csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
      ok(testModel);
    });

    it("allow combination of negation scope and normal scope for the same multiple scopes", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp, csharp, python, !python, java")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
      ok(testModel);
    });

    it("allow multiple separated negation scopes", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp, !java")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "Test");
      ok(testModel);
    });

    it("negation scope override normal scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "!python, !java")
          @clientName("TestRenamed", "csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
      ok(testModel);
    });

    it("normal scope incrementally add", async () => {
      const tsp = `
        @service
        @test namespace MyService {
          @test
          @clientName("TestRenamedAgain", "csharp")
          @clientName("TestRenamed", "!python, !java")
          model Test {
            prop: string;
          }
          @test
          @access(Access.internal)
          op func(
            @body body: Test
          ): void;
        }
      `;
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(tsp);
      const csharpSdkPackage = runnerWithCSharp.context.sdkPackage;
      const csharpTestModel = csharpSdkPackage.models.find((x) => x.name === "TestRenamedAgain");
      ok(csharpTestModel);

      const runnerWithPython = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });
      await runnerWithPython.compile(tsp);
      const pythonSdkPackage = runnerWithPython.context.sdkPackage;
      const pythonTestModel = pythonSdkPackage.models.find((x) => x.name === "Test");
      ok(pythonTestModel);
    });

    it("negation scope override negation scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "!python, !java")
          @clientName("TestRenamed", "!go")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
      ok(testModel);
    });

    it("negation scope override normal scope with the same scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "!csharp")
          @clientName("TestRenamed", "csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
      ok(testModel);
    });

    it("normal scope override negation scope with the same scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "csharp")
          @clientName("TestRenamed", "!csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
      ok(testModel);
    });
  });

  describe("scope decorator", () => {
    it("include operation from csharp client", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          model Test {
            prop: string;
          }
          @scope("csharp")
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
      const model = sdkPackage.models.find((x) => x.name === "Test");
      ok(client);
      ok(model);
    });

    it("exclude operation from csharp client", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          model Test {
            prop: string;
          }
          @scope("!csharp")
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
      const model = sdkPackage.models.find((x) => x.name === "Test");
      strictEqual(client, undefined);
      strictEqual(model, undefined);
    });

    it("negation scope override", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const runnerWithJava = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-java",
      });
      const spec = `
        @service
        namespace MyService {
          model Test {
            prop: string;
          }
          @scope("!java")
          @scope("!csharp")
          op func(
            @body body: Test
          ): void;
        }
      `;
      await runnerWithCSharp.compile(spec);
      const csharpSdkPackage = runnerWithCSharp.context.sdkPackage;
      const csharpSdkClient = csharpSdkPackage.clients.find((x) =>
        x.methods.find((m) => m.name === "func"),
      );
      const csharpSdkModel = csharpSdkPackage.models.find((x) => x.name === "Test");
      ok(csharpSdkClient);
      ok(csharpSdkModel);

      await runnerWithJava.compile(spec);
      const javaSdkPackage = runnerWithJava.context.sdkPackage;
      const javaSdkClient = javaSdkPackage.clients.find((x) =>
        x.methods.find((m) => m.name === "func"),
      );
      const javaSdkModel = javaSdkPackage.models.find((x) => x.name === "Test");
      strictEqual(javaSdkClient, undefined);
      strictEqual(javaSdkModel, undefined);
    });

    it("no scope decorator", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
      const model = sdkPackage.models.find((x) => x.name === "Test");
      ok(client);
      ok(model);
    });

    it("negation scope override normal scope", async () => {
      const runnerWithCSharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          model Test {
            prop: string;
          }
          @scope("!csharp")
          @scope("csharp")
          op func(
            @body body: Test
          ): void;
        }
      `);

      const sdkPackage = runnerWithCSharp.context.sdkPackage;
      const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
      const model = sdkPackage.models.find((x) => x.name === "Test");
      ok(client);
      ok(model);
    });
  });
});
