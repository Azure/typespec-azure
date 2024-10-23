import { Model, Operation } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getClientNameOverride } from "../../src/decorators.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("@clientName", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("carry over", async () => {
    const { Test1, Test2, func1, func2 } = (await runner.compile(`
      @service({})
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
      @service({})
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
      @service({
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
      @service({
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
      @service({})
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
      @service({})
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
