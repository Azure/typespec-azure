import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

describe("cross-namespace duplicate name validation", () => {
  // Cross-namespace validation runs when the --namespace flag is set.
  // When namespaces are flattened, types with the same name across different namespaces
  // will collide in the generated client.

  it("error for same model name across namespaces with namespace flag", async () => {
    // Same-named models in different namespaces will collide when namespace flag is set
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          model Foo { a: string; }
          @route("/a") op getA(): Foo;
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          model Foo { b: string; }
          @route("/b") op getB(): Foo;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program, { namespace: "CombineClient" });
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "Foo" is duplicated in language scope: "python"',
      },
    ]);
  });

  it("error for same enum name across namespaces with namespace flag", async () => {
    // Same-named enums in different namespaces will collide when namespace flag is set
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          enum Status { Active, Inactive }
          @route("/a") op getA(@query status: Status): void;
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          enum Status { Pending, Complete }
          @route("/b") op getB(@query status: Status): void;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program, { namespace: "CombineClient" });
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "Status" is duplicated in language scope: "python"',
      },
    ]);
  });

  it("error for same union name across namespaces with namespace flag", async () => {
    // Same-named unions in different namespaces will collide when namespace flag is set
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          union MyUnion { string, int32 }
          @route("/a") op getA(@query value: MyUnion): void;
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          union MyUnion { boolean, float32 }
          @route("/b") op getB(@query value: MyUnion): void;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program, { namespace: "CombineClient" });
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "MyUnion" is duplicated in language scope: "python"',
      },
    ]);
  });

  it("no error for different names across namespaces with namespace flag", async () => {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          model FooA { a: string; }
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          model FooB { b: string; }
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program, { namespace: "CombineClient" });
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);
  });

  it("error for @clientName same name across namespaces with namespace flag", async () => {
    // @clientName causing same name across namespaces will collide when namespace flag is set
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          @clientName("SharedName")
          model ModelA { a: string; }
          @route("/a") op getA(): ModelA;
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          @clientName("SharedName")
          model ModelB { b: string; }
          @route("/b") op getB(): ModelB;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program, { namespace: "CombineClient" });
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "SharedName" is duplicated in language scope: "python"',
      },
    ]);
  });

  it("error for nested namespace type with same name with namespace flag", async () => {
    // Nested namespaces will also collide when namespace flag is set
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          namespace Sub {
            model Nested { a: string; }
          }
          @route("/a") op getA(): Sub.Nested;
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          namespace Sub {
            model Nested { b: string; }
          }
          @route("/b") op getB(): Sub.Nested;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program, { namespace: "CombineClient" });
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "Nested" is duplicated in language scope: "python"',
      },
    ]);
  });

  it("no error for same model name in single-service (different namespaces)", async () => {
    // In single-service mode, same names in different namespaces are OK
    const diagnostics = await SimpleTester.diagnose(
      `
      @service
      namespace MyService {
        namespace SubA {
          model Foo { a: string; }
        }
        namespace SubB {
          model Foo { b: string; }
        }
      }
      `,
    );

    expectDiagnosticEmpty(diagnostics);
  });

  it("no error for same API version enum name across namespaces with namespace flag", async () => {
    // API version enums (e.g., "Versions") commonly have the same name across services
    // and that's expected and allowed - they're identified by UsageFlags.ApiVersionEnum
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(Versions)
        namespace ServiceA {
          enum Versions { v1 }
          model FooA { a: string; }
          @route("/a") op getA(): FooA;
        }
        @service
        @versioned(Versions)
        namespace ServiceB {
          enum Versions { v1 }
          model FooB { b: string; }
          @route("/b") op getB(): FooB;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.Versions.v1, ServiceB.Versions.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program, { namespace: "CombineClient" });
    // Should not report errors for "Versions" enums being duplicated
    // because they are API version enums
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);
  });

  it("no error for same model name across services in multi-service client without namespace flag", async () => {
    // Multi-service clients without namespace flag should NOT raise duplicate name errors
    // because the namespaces are not being flattened
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          model Foo { a: string; }
          @route("/a") op getA(): Foo;
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          model Foo { b: string; }
          @route("/b") op getB(): Foo;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    // No namespace flag - should not report cross-namespace duplicates
    const context = await createSdkContextForTester(program);
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);
  });

  it("no error for same enum name across services in multi-service client without namespace flag", async () => {
    // Multi-service clients without namespace flag should NOT raise duplicate name errors
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          enum Status { Active, Inactive }
          @route("/a") op getA(@query status: Status): void;
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          enum Status { Pending, Complete }
          @route("/b") op getB(@query status: Status): void;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    // No namespace flag - should not report cross-namespace duplicates
    const context = await createSdkContextForTester(program);
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);
  });

  it("no error for same API version enum name across services in multi-service client without namespace flag", async () => {
    // API version enums with the same name in multi-service clients without namespace flag should not error
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service
        @versioned(Versions)
        namespace ServiceA {
          enum Versions { v1 }
          model FooA { a: string; }
          @route("/a") op getA(): FooA;
        }
        @service
        @versioned(Versions)
        namespace ServiceB {
          enum Versions { v1 }
          model FooB { b: string; }
          @route("/b") op getB(): FooB;
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.Versions.v1, ServiceB.Versions.v1)
        namespace CombineClient;
        `,
      ),
    );

    // No namespace flag - should not report any duplicates
    const context = await createSdkContextForTester(program);
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);
  });

  it("error for duplicate model name within same service namespace", async () => {
    // Within the same service namespace, duplicate names ARE an error
    const diagnostics = await SimpleTester.diagnose(
      `
      @service
      namespace MyService {
        model Foo { a: string; }
        @clientName("Foo")
        model Bar { b: string; }
      }
      `,
    );

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      },
    ]);
  });
});

it("no duplicate operation with @clientLocation", async () => {
  const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
    `
    @service
    namespace StorageService;
      
    interface StorageTasks {
      @clientLocation("StorageTasksReport")
      @route("/list")
      op list(): void;

      @clientLocation("StorageTaskAssignment")
      @clientName("list")
      @route("/assignments")
      op storageTaskAssignmentList(): void;
    }
    `,
  );

  await createSdkContextForTester(program);
  expectDiagnosticEmpty(diagnostics);
});

it("no duplicate operation with @clientLocation another", async () => {
  const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
    `
    @service
    namespace StorageService;
      
    interface StorageTasks {
      @route("/list")
      op list(): void;

      @clientLocation("StorageTaskAssignment")
      @clientName("list")
      @route("/assignments")
      op storageTaskAssignmentList(): void;
    }
    `,
  );

  await createSdkContextForTester(program);
  expectDiagnosticEmpty(diagnostics);
});

it("duplicate operation with @clientLocation to existed clients", async () => {
  const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
    `
    @service
    namespace Contoso.WidgetManager;
      
    interface A {
      @clientLocation(B)
      @route("/a")
      op a(): void;

      @route("/b")
      op b(): void;
    }

    interface B {
      @route("/c")
      @clientName("a")
      op c(): void;
    }
    `,
  );

  await createSdkContextForTester(program);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "a" is duplicated in language scope: "AllScopes"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message:
        'Client name: "a" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
  ]);
});

it("no duplicate operation with @clientLocation string to existing namespace name", async () => {
  // String targets always create new clients, they don't resolve to existing namespaces.
  // So there is no conflict between the moved operation and existing operations.
  const diagnostics = await SimpleTester.diagnose(
    `
    @service
    namespace Contoso.WidgetManager;

    interface A {
      @clientLocation("Test")
      @route("/a")
      op a(): void;

      @route("/b")
      op b(): void;
    }

    namespace Test {
      @route("/c")
      @clientName("a")
      op c(): void;
    }
    `,
  );

  expectDiagnosticEmpty(diagnostics);
});

it("no duplicate operation with @clientLocation string to existing namespace", async () => {
  // When using a string that matches an existing namespace name,
  // the operation should be moved to that namespace - no conflict if names are different
  const diagnostics = await SimpleTester.diagnose(
    `
    @service
    namespace Contoso.WidgetManager;

    interface A {
      @clientLocation("Test")
      @route("/a")
      op a(): void;

      @route("/b")
      op b(): void;
    }

    namespace Test {
      @route("/c")
      op c(): void;
    }
    `,
  );

  expectDiagnosticEmpty(diagnostics);
});

it("duplicate operation with @clientLocation to existed clients with scope", async () => {
  const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
    `
    @service
    namespace Contoso.WidgetManager;

    interface A {
      @clientLocation(B, "go")
      @route("/a")
      op a(): void;

      @route("/b")
      op b(): void;
    }

    interface B {
      @route("/c")
      @clientName("a")
      op c(): void;
    }
    `,
  );

  await createSdkContextForTester(program);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "a" is duplicated in language scope: "go"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message:
        'Client name: "a" is defined somewhere causing naming conflicts in language scope: "go"',
    },
  ]);
});

it("duplicate operation with @clientLocation to new clients", async () => {
  const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
    `
    @service
    namespace Contoso.WidgetManager;
      
    interface A {
      @clientLocation("B")
      @route("/a")
      op a(): void;

      @route("/b")
      @clientLocation("B")
      @clientName("a")
      op b(): void;
    }
    `,
  );

  await createSdkContextForTester(program);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message:
        'Client name: "a" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "a" is duplicated in language scope: "AllScopes"',
    },
  ]);
});

it("duplicate operation warning for .NET", async () => {
  const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
    `
    @service
    namespace StorageService;
      
    interface StorageTasks {
      @route("/list")
      op list(): void;

      @clientName("list", "csharp")
      @route("/listByParent")
      op listByParent(parent: string): void;
    }
    `,
  );

  await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-net" });
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
      message:
        'Client name: "list" is defined somewhere causing naming conflicts in language scope: "csharp"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
      message: 'Client name: "list" is duplicated in language scope: "csharp"',
    },
  ]);
});

it("duplicate operation error for other languages", async () => {
  const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
    `
    @service
    namespace StorageService;

    interface StorageTasks {
      @route("/list")
      op list(): void;

      @clientName("list")
      @route("/listByParent")
      op listByParent(parent: string): void;
    }
    `,
  );

  await createSdkContextForTester(program);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message:
        'Client name: "list" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
    },
    {
      code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
      message: 'Client name: "list" is duplicated in language scope: "AllScopes"',
    },
  ]);
});

describe("namespace flag duplicate name validation", () => {
  it("cross-namespace collision with namespace flag", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        namespace SubA {
          model Foo { a: string; }
          @route("/a") op getA(): Foo;
        }
        namespace SubB {
          model Foo { b: string; }
          @route("/b") op getB(): Foo;
        }
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
      namespace: "Flattened",
    });

    // When namespace flag is set, cross-namespace collisions should be reported
    expectDiagnostics(context.diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "Foo" is duplicated in language scope: "python"',
      },
    ]);
  });

  it("no collision without namespace flag", async () => {
    // Without namespace flag, same names in different namespaces are OK
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        namespace SubA {
          model Foo { a: string; }
        }
        namespace SubB {
          model Foo { b: string; }
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
  });

  it("cross-namespace enum collision with namespace flag", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace MyService {
        namespace SubA {
          enum Status { Active }
          @route("/a") op getA(@query status: Status): void;
        }
        namespace SubB {
          enum Status { Pending }
          @route("/b") op getB(@query status: Status): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
      namespace: "Flattened",
    });

    expectDiagnostics(context.diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "Status" is duplicated in language scope: "python"',
      },
    ]);
  });

  it("no duplicate error for generic union template instantiations", async () => {
    // Generic unions instantiated with different type parameters should not cause duplicate errors
    const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
      `
      @service
      namespace TestService {
        union Dfe<T> {
          default: T,
          unspecified: "unspecified",
        }

        model TestModel {
          intProperty: Dfe<int32>;
          boolProperty: Dfe<boolean>;
        }

        @route("/test")
        op testOp(): TestModel;
      }
      `,
    );

    // Create SDK context to trigger validation
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });

    const duplicateDiagnostics = diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);

    // Validate the TestModel shape - it should have two properties with union types
    const testModel = context.sdkPackage.models.find((m) => m.name === "TestModel");
    strictEqual(testModel !== undefined, true, "TestModel should exist");
    strictEqual(testModel!.properties.length, 2, "TestModel should have 2 properties");

    const intProp = testModel!.properties.find(
      (p) => p.kind === "property" && p.name === "intProperty",
    );
    const boolProp = testModel!.properties.find(
      (p) => p.kind === "property" && p.name === "boolProperty",
    );

    strictEqual(intProp !== undefined, true, "intProperty should exist");
    strictEqual(boolProp !== undefined, true, "boolProperty should exist");

    // Both properties should have union types
    strictEqual(intProp!.type.kind, "union", "intProperty should be a union type");
    strictEqual(boolProp!.type.kind, "union", "boolProperty should be a union type");

    // The union names should include the template parameter (e.g., "DfeInt32", "DfeBoolean")
    strictEqual(
      intProp!.type.name.startsWith("Dfe"),
      true,
      "intProperty union name should start with 'Dfe'",
    );
    strictEqual(
      boolProp!.type.name.startsWith("Dfe"),
      true,
      "boolProperty union name should start with 'Dfe'",
    );
    strictEqual(
      intProp!.type.name !== boolProp!.type.name,
      true,
      "The two union types should have different names",
    );
  });

  it("no duplicate error for generic model template instantiations", async () => {
    // Generic models instantiated with different type parameters should not cause duplicate errors
    const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
      `
      @service
      namespace TestService {
        model Response<T> {
          value: T;
        }

        @route("/int")
        op getInt(): Response<int32>;

        @route("/string")
        op getString(): Response<string>;
      }
      `,
    );

    // Create SDK context to trigger validation
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });

    const duplicateDiagnostics = diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);

    // Validate that both response types are generated with unique names
    const responseModels = context.sdkPackage.models.filter((m) => m.name.startsWith("Response"));
    strictEqual(responseModels.length, 2, "Should have 2 Response model instantiations");

    // The models should have different names (e.g., "ResponseInt32", "ResponseString")
    const names = responseModels.map((m) => m.name).sort();
    strictEqual(names[0] !== names[1], true, "The two Response models should have different names");

    // Each model should have a 'value' property with the correct type
    const intResponse = responseModels.find((m) =>
      m.properties.find((p) => p.kind === "property" && p.type.kind === "int32"),
    );
    const stringResponse = responseModels.find((m) =>
      m.properties.find((p) => p.kind === "property" && p.type.kind === "string"),
    );

    strictEqual(intResponse !== undefined, true, "Should have a Response model with int32 value");
    strictEqual(
      stringResponse !== undefined,
      true,
      "Should have a Response model with string value",
    );
  });

  it("no duplicate error for generic union with @alternateType decorator", async () => {
    // Generic unions with @alternateType decorator and multiple instantiations should not cause duplicate errors
    const [{ program }, diagnostics] = await SimpleTester.compileAndDiagnose(
      `
      @service
      namespace TestService {
        model DataFactoryElementModel {}

        @alternateType({identity: "Azure.Core.Expressions.DataFactoryElement"}, "csharp")
        union Dfe<T> {
          T,
          DataFactoryElementModel
        }

        model TestModel {
          stringProperty: Dfe<string>;
          intProperty: Dfe<int32>;
          boolProperty: Dfe<boolean>;
        }

        @route("/test")
        op testOp(): TestModel;
      }
      `,
    );

    // Create SDK context to trigger validation
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });

    const duplicateDiagnostics = diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnosticEmpty(duplicateDiagnostics);

    // Validate the TestModel shape
    const testModel = context.sdkPackage.models.find((m) => m.name === "TestModel");
    strictEqual(testModel !== undefined, true, "TestModel should exist");
    strictEqual(testModel!.properties.length, 3, "TestModel should have 3 properties");

    const stringProp = testModel!.properties.find(
      (p) => p.kind === "property" && p.name === "stringProperty",
    );
    const intProp = testModel!.properties.find(
      (p) => p.kind === "property" && p.name === "intProperty",
    );
    const boolProp = testModel!.properties.find(
      (p) => p.kind === "property" && p.name === "boolProperty",
    );

    strictEqual(stringProp !== undefined, true, "stringProperty should exist");
    strictEqual(intProp !== undefined, true, "intProperty should exist");
    strictEqual(boolProp !== undefined, true, "boolProperty should exist");

    // All properties should have union types
    strictEqual(stringProp!.type.kind, "union", "stringProperty should be a union type");
    strictEqual(intProp!.type.kind, "union", "intProperty should be a union type");
    strictEqual(boolProp!.type.kind, "union", "boolProperty should be a union type");

    // The union names should be unique for each template instantiation
    const unionNames = new Set([stringProp!.type.name, intProp!.type.name, boolProp!.type.name]);
    strictEqual(unionNames.size, 3, "All three union types should have unique names");
  });
});
