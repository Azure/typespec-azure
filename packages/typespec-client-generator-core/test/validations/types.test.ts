import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("no-discriminated-unions", async () => {
  const diagnostics = await runner.diagnose(
    `
      @service
      namespace Contoso.WidgetManager;
      
      model Cat {
        name: string;
        meow: int32;
      }

      model Dog {
        name: string;
        bark: string;
      }

      @discriminated
      union Pet {
        cat: Cat,
        dog: Dog,
      }

      @discriminated(#{ discriminatorPropertyName: "dataKind", envelopePropertyName: "data" })
      union AnotherPet {
        cat: Cat,
        dog: Dog,
      }
    `,
  );

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/no-discriminated-unions",
    },
    {
      code: "@azure-tools/typespec-client-generator-core/no-discriminated-unions",
    },
  ]);
});

it("no duplicate operation with @clientLocation", async () => {
  const diagnostics = await runner.diagnose(
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

  expectDiagnosticEmpty(diagnostics);
});

it("no duplicate operation with @clientLocation another", async () => {
  const diagnostics = await runner.diagnose(
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

  expectDiagnosticEmpty(diagnostics);
});

it("duplicate operation with @clientLocation to existed clients", async () => {
  const diagnostics = await runner.diagnose(
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

it("duplicate operation with @clientLocation to existed clients with scope", async () => {
  const diagnostics = await runner.diagnose(
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
  const diagnostics = await runner.diagnose(
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
  const netRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-net" });

  const diagnostics = await netRunner.diagnose(
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
  const diagnostics = await runner.diagnose(
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
