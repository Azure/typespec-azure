import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { getClientNameOverride } from "../../src/decorators.js";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

it("carry over", async () => {
  const { program, Test1, Test2, func1, func2 } = await SimpleTester.compile(t.code`
  @service
  namespace ${t.namespace("MyService")} {
    @clientName("Test1Rename")
    model ${t.model("Test1")}{}

    model ${t.model("Test2")} is Test1{}

    @route("/func1")
    @clientName("func1Rename")
    op ${t.op("func1")}(): void;

    @route("/func2")
    op ${t.op("func2")} is func1;
      }
    `);

  const context = await createSdkContextForTester(program);
  strictEqual(getClientNameOverride(context, Test1), "Test1Rename");
  strictEqual(getClientNameOverride(context, Test2), undefined);
  strictEqual(getClientNameOverride(context, func1), "func1Rename");
  strictEqual(getClientNameOverride(context, func2), undefined);
});

it("augment carry over", async () => {
  const { program, Test1, Test2, func1, func2 } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      t.code`
      @service
      namespace ${t.namespace("MyService")} {
        model ${t.model("Test1")}{}

        model ${t.model("Test2")} is Test1{}

        @route("/func1")
        op ${t.op("func1")}(): void;

        @route("/func2")
        op ${t.op("func2")} is func1;
      }
    `,
      `
      namespace Customizations;

      @@clientName(MyService.Test1, "Test1Rename");
      @@clientName(MyService.func1, "func1Rename");
    `,
    ),
  );

  const context = await createSdkContextForTester(program);
  strictEqual(getClientNameOverride(context, Test1), "Test1Rename");
  strictEqual(getClientNameOverride(context, Test2), undefined);
  strictEqual(getClientNameOverride(context, func1), "func1Rename");
  strictEqual(getClientNameOverride(context, func2), undefined);
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
    const { program } = await SimpleTester.compile(testCode);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });
    strictEqual(context.sdkPackage.models[0].name, "TestJava");
  }

  // csharp
  {
    const { program } = await SimpleTester.compile(testCode);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    strictEqual(context.sdkPackage.models[0].name, "TestCSharp");
  }

  // python
  {
    const { program } = await SimpleTester.compile(testCode);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(context.sdkPackage.models[0].name, "Test");
  }
});

it("augmented @clientName with scope of versioning", async () => {
  const mainCode = `
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
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customization),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });
    strictEqual(context.sdkPackage.models[0].name, "TestJava");
  }

  // csharp
  {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customization),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    strictEqual(context.sdkPackage.models[0].name, "TestCSharp");
  }

  // python
  {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customization),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(context.sdkPackage.models[0].name, "Test");
  }
});

it("decorator on template parameter", async function () {
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program);
  strictEqual(context.sdkPackage.clients[0].methods[0].parameters[0].name, "body");
});

it("apply with @client decorator to namespace client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    @client
    @clientName("MyServiceClient")
    namespace MyService;
    op test(): void;
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(context.sdkPackage.clients[0].name, "MyServiceClient");
});

it("apply with @client decorator to interface client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService;

    @client
    @clientName("MyInterfaceClient")
    interface MyInterface {
      op test(): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(context.sdkPackage.clients[0].name, "MyInterfaceClient");
});

it("apply with @operationGroup decorator to interface client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService;

    @operationGroup
    @clientName("MyOperationGroup")
    interface MyInterface {
      op test(): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(context.sdkPackage.clients.length, 1);
  const myServiceClient = context.sdkPackage.clients[0];
  strictEqual(myServiceClient.name, "MyServiceClient");
  ok(myServiceClient.children);
  strictEqual(myServiceClient.children.length, 1);
  const myOperationGroup = myServiceClient.children[0];
  strictEqual(myOperationGroup.name, "MyOperationGroup");
});

it("overrides client name from @client definition", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService;

    @client({"name": "DoNotUseThisName"})
    @clientName("MyInterfaceClient")
    interface MyInterface {
      op test(): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(context.sdkPackage.clients[0].name, "MyInterfaceClient");
});

it("empty client name", async () => {
  const diagnostics = await SimpleTester.diagnose(`
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
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "Test" is defined somewhere causing naming conflicts in language scope: "random"',
    },
  ]);
});

it("duplicate model, enum, union client name with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "B" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
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
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "b" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate operation in interface with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "b" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate interface with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "B" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate model property with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "prop2" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate enum member with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "two" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate union variant with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "b" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate namespace with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "B" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate enum and model within nested namespace for all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "B" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate model with model only generation for all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "Foo" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "Foo" is duplicated in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate model client name with multiple language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
        'Client name: "Test" is defined somewhere causing naming conflicts in language scope: "csharp"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "Test" is duplicated in language scope: "python"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message:
        'Client name: "Test" is defined somewhere causing naming conflicts in language scope: "python"',
    },
  ]);
});
