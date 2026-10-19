import { getSourceLocation } from "@typespec/compiler";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
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
    @client({service: MyService})
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

    @client({service: MyService})
    @clientName("MyInterfaceClient")
    interface MyInterface {
      op test(): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(context.sdkPackage.clients[0].name, "MyInterfaceClient");
});

it("apply to interface client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService;

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

    @client({"name": "DoNotUseThisName", "service": MyService})
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

it("duplicate scalar with all language scopes", async () => {
  const diagnostics = await SimpleTester.diagnose(
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
      message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message:
        'Client name: "B" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
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

describe("top-level client names across declaration kinds", () => {
  const declarations = [
    "model First {}",
    "scalar First extends string;",
    "enum First { one }",
    'union First { one: "one" }',
    "interface First {}",
    "namespace First {}",
  ];
  const duplicate = (name: string, scope = "AllScopes", renamed = true) => ({
    code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    severity: "error" as const,
    message: renamed
      ? `Client name: "${name}" is duplicated in language scope: "${scope}"`
      : `Client name: "${name}" is defined somewhere causing naming conflicts in language scope: "${scope}"`,
  });

  it.each(
    declarations.flatMap((left, index) =>
      declarations.slice(index + 1).map((right) => [left, right.replace("First", "Second")]),
    ),
  )("compares %s with %s in the same namespace", async (left, right) => {
    const diagnostics = await SimpleTester.diagnose(`
      @service namespace Example;
      @clientName("Shared") ${left}
      @clientName("Shared") ${right}
    `);
    expectDiagnostics(diagnostics, [duplicate("Shared"), duplicate("Shared")]);
  });

  it("targets both the authored type and the conflicting clientName decorator", async () => {
    const [{ Widget, Group }, diagnostics] = await SimpleTester.compileAndDiagnose(t.code`
      @service namespace Example;
      model ${t.model("Widget")} {}
      @clientName("Widget") interface ${t.interface("Group")} { op read(): Widget; }
    `);
    const decorator = Group.decorators.find((x) => x.definition?.name === "@clientName")?.node;
    ok(decorator);
    const typeLocation = getSourceLocation(Widget);
    const decoratorLocation = getSourceLocation(decorator);
    expectDiagnostics(diagnostics, [
      {
        ...duplicate("Widget", "AllScopes", false),
        pos: typeLocation.pos,
        end: typeLocation.end,
      },
      { ...duplicate("Widget"), pos: decoratorLocation.pos, end: decoratorLocation.end },
    ]);
  });

  it.each(["csharp", "java", "python", "javascript"])(
    "checks cross-kind names in the %s scope",
    async (scope) => {
      const diagnostics = await SimpleTester.diagnose(`
        @service namespace Example;
        @clientName("Item", "${scope}") model Widget {}
        @clientName("Item", "${scope}") interface Group { op read(): Widget; }
      `);
      expectDiagnostics(diagnostics, [duplicate("Item", scope), duplicate("Item", scope)]);
    },
  );

  it("does not combine names from different language scopes", async () => {
    await SimpleTester.compile(`
      @service namespace Example;
      @clientName("Item", "csharp") model Widget {}
      @clientName("Item", "java") interface Group { op read(): Widget; }
    `);
  });

  it("uses common fallback names within a language scope", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service namespace Example;
      @clientName("Item") model Widget {}
      @clientName("Item", "csharp") interface Group { op read(): Widget; }
    `);
    expectDiagnostics(diagnostics, [duplicate("Item", "csharp"), duplicate("Item", "csharp")]);
  });

  it("honors negated scopes without mixing names", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service namespace Example;
      @clientName("Item", "!csharp") model Widget {}
      @clientName("Item", "java") interface Group { op read(): Widget; }
    `);
    expectDiagnostics(diagnostics, [duplicate("Item", "java"), duplicate("Item", "java")]);
    await SimpleTester.compile(`
      @service namespace Example;
      @clientName("Item", "!csharp") model Widget {}
      @clientName("Item", "csharp") interface Group { op read(): Widget; }
    `);
  });

  it.each(["Widget_Admin", "widget"])(
    "preserves complete case-sensitive names: %s",
    async (name) => {
      await SimpleTester.compile(`
      @service namespace Example;
      model Widget {}
      @clientName("${name}") interface Group { op read(): Widget; }
    `);
    },
  );

  it("checks unused declarations and nested namespaces without following operation results", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service namespace Example;
      namespace Nested {
        model Widget {}
        @clientName("Widget") interface Group { op read(): string; }
      }
    `);
    expectDiagnostics(diagnostics, [duplicate("Widget", "AllScopes", false), duplicate("Widget")]);
  });

  it("does not flatten declarations or traverse model graphs across namespaces", async () => {
    await SimpleTester.compile(`
      @service namespace Example;
      namespace Types {
        @discriminator("kind") model Base { kind: string; }
        model Widget extends Base { kind: "widget"; child?: Widget; }
        model Container { child: Widget; }
      }
      @clientName("Widget") interface Group {
        @route("/base") op read(): Types.Base;
        @route("/container") op readContainer(): Types.Container;
      }
    `);
    await SimpleTester.compile(`
      @service namespace Example;
      model Widget {}
      namespace Operations {
        @clientName("Widget") interface Group { op read(): Example.Widget; }
      }
    `);
  });

  it("does not compare root operations or virtual client names with type declarations", async () => {
    await SimpleTester.compile(`
      @service namespace Example;
      model Widget {}
      @route("/root") op Widget_Read(): Widget;
      @clientLocation("Widget") @route("/moved") op read(): Widget;
    `);
  });

  it("reports each declaration once per conflicting scope, not once per operation", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service namespace Example;
      @clientName("Item", "csharp") model Widget {}
      @clientName("Item", "csharp") interface Group {
        @route("/one") op one(): Widget;
        @route("/two") op two(): Widget;
      }
    `);
    expectDiagnostics(diagnostics, [duplicate("Item", "csharp"), duplicate("Item", "csharp")]);
  });

  it("retains declaration-name validation rather than introducing friendly-name resolution", async () => {
    await SimpleTester.compile(`
      @service namespace Example;
      @friendlyName("Item") model Widget {}
      @clientName("Item") interface Group { op read(): Widget; }
    `);
  });
});
