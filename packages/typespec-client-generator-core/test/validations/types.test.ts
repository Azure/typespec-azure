import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import {
  ArmTester,
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

describe("multi-service duplicate name validation", () => {
  // In multi-service scenarios, models/enums/unions with the same name in different services
  // ARE duplicates because combining multiple services into one client means all types
  // will be in the same client.

  it("error for same model name across services in multi-service client", async () => {
    // Same-named models in different services will collide when combined into one client
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          model Foo { a: string; }
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          model Foo { b: string; }
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program);
    expectDiagnostics([...diagnostics, ...context.diagnostics], [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Foo" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Foo" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
    ]);
  });

  it("error for same enum name across services in multi-service client", async () => {
    // Same-named enums in different services will collide when combined into one client
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          enum Status { Active, Inactive }
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          enum Status { Pending, Complete }
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program);
    expectDiagnostics([...diagnostics, ...context.diagnostics], [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Status" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Status" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
    ]);
  });

  it("error for same union name across services in multi-service client", async () => {
    // Same-named unions in different services will collide when combined into one client
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          union MyUnion { string, int32 }
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          union MyUnion { boolean, float32 }
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program);
    // Filter to only check TCGC duplicate-client-name diagnostics (ignore Azure Core union warnings)
    const allDiagnostics = [...diagnostics, ...context.diagnostics].filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );
    expectDiagnostics(allDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "MyUnion" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "MyUnion" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
    ]);
  });

  it("no error for different names across services", async () => {
    const [_, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
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

    expectDiagnosticEmpty(diagnostics);
  });

  it("error for @clientName same name across services in multi-service client", async () => {
    // @clientName causing same name across services will collide when combined into one client
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          @clientName("SharedName")
          model ModelA { a: string; }
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          @clientName("SharedName")
          model ModelB { b: string; }
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program);
    expectDiagnostics([...diagnostics, ...context.diagnostics], [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "SharedName" is duplicated in language scope: "AllScopes"',
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "SharedName" is duplicated in language scope: "AllScopes"',
      },
    ]);
  });

  it("error for nested namespace type with same name in multi-service client", async () => {
    // Nested namespaces in different services will also collide when combined into one client
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        `
        @service
        @versioned(VersionsA)
        namespace ServiceA {
          enum VersionsA { v1 }
          namespace Sub {
            model Nested { a: string; }
          }
        }
        @service
        @versioned(VersionsB)
        namespace ServiceB {
          enum VersionsB { v1 }
          namespace Sub {
            model Nested { b: string; }
          }
        }
        `,
        `
        @client({ name: "CombineClient", service: [ServiceA, ServiceB] })
        @useDependency(ServiceA.VersionsA.v1, ServiceB.VersionsB.v1)
        namespace CombineClient;
        `,
      ),
    );

    const context = await createSdkContextForTester(program);
    expectDiagnostics([...diagnostics, ...context.diagnostics], [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Nested" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Nested" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
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

  it("no error for same API version enum name across services in multi-service client", async () => {
    // API version enums (e.g., "Versions") commonly have the same name across services
    // and that's expected and allowed - they're identified by UsageFlags.ApiVersionEnum
    const [_, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
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

    // Should not report errors for "Versions" enums being duplicated
    // because they are API version enums
    expectDiagnosticEmpty(diagnostics);
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

  it("error for user-defined type conflicting with Azure.ResourceManager type", async () => {
    // User-defined types should not conflict with ARM library types like ExtensionResource.
    // Both the user's ExtensionResource and ARM's ExtensionResource would be generated
    // into the SDK, causing naming conflicts.
    const [{ program }, diagnostics] = await ArmTester.compileAndDiagnose(`
      @armProviderNamespace("My.Service")
      @server("http://localhost:3000", "endpoint")
      @service(#{title: "My.Service"})
      @versioned(Versions)
      @armCommonTypesVersion(CommonTypes.Versions.v5)
      namespace My.Service;

      /** Api versions */
      enum Versions {
        /** 2024-04-01-preview api version */
        V2024_04_01_PREVIEW: "2024-04-01-preview",
      }

      // User defines a model with @clientName that conflicts with ARM's ExtensionResource
      @clientName("ExtensionResource")
      model MyExtensionResource {
        name: string;
        value: int32;
      }

      model TestTrackedResource is TrackedResource<TestTrackedResourceProperties> {
        ...ResourceNameParameter<TestTrackedResource>;
      }

      model TestTrackedResourceProperties {
        description?: string;
        // Reference the user's ExtensionResource
        extension?: MyExtensionResource;
      }

      @armResourceOperations
      interface Tests {
        get is ArmResourceRead<TestTrackedResource>;
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    // Should report a single diagnostic because user's @clientName("ExtensionResource")
    // conflicts with ARM's ExtensionResource type
    expectDiagnostics([...diagnostics, ...context.diagnostics], [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: 'Client name: "ExtensionResource" is duplicated in language scope: "AllScopes"',
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

it("duplicate operation with @clientLocation string to existing namespace", async () => {
  // When using a string that matches an existing namespace name,
  // the operation should be moved to that namespace for validation
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
        }
        namespace SubB {
          model Foo { b: string; }
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
        message:
          'Client name: "Foo" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Foo" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
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
        }
        namespace SubB {
          enum Status { Pending }
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
        message:
          'Client name: "Status" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message:
          'Client name: "Status" is defined somewhere causing naming conflicts in language scope: "AllScopes"',
      },
    ]);
  });
});
