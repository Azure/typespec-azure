import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  ArmTesterWithService,
  createSdkContextForTester,
  SimpleTesterWithService,
} from "../tester.js";

describe("duplicate models in sdkPackage.models", () => {
  it("should not have same object reference duplicates", async () => {
    const { program } = await ArmTesterWithService.compile(`
      model KeyEncryptionKeyIdentity {
        localType?: string;
      }

      model MyEncryption {
        customerManagedKeyEncryption?: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
        localKeyIdentity?: KeyEncryptionKeyIdentity;
      }

      @route("/test")
      op test(@body body: MyEncryption): void;
    `);

    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    // Check for true duplicates (same object appearing twice)
    const uniqueModels = new Set(sdkPackage.models);
    strictEqual(
      uniqueModels.size,
      sdkPackage.models.length,
      `Found ${sdkPackage.models.length - uniqueModels.size} duplicate model entries (same object reference)`,
    );
  });

  it("should emit warning for same-name models in different namespaces", async () => {
    const { program } = await ArmTesterWithService.compile(`
      // Local model with same name as ARM common type
      model KeyEncryptionKeyIdentity {
        localType?: string;
      }

      model MyEncryption {
        customerManagedKeyEncryption?: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
        localKeyIdentity?: KeyEncryptionKeyIdentity;
      }

      @route("/test")
      op test(@body body: MyEncryption): void;
    `);

    const context = await createSdkContextForTester(program);

    // Check if duplicate-client-name-warning is emitted for cross-namespace duplicates
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
    );

    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
        message:
          /Client name: "KeyEncryptionKeyIdentity" in namespace .* conflicts with same name in namespace/,
      },
    ]);
  });

  it("should not emit warning when clientName is used to differentiate", async () => {
    const { program } = await ArmTesterWithService.compile(`
      // Local model with same name as ARM common type, but renamed
      @clientName("LocalKeyEncryptionKeyIdentity")
      model KeyEncryptionKeyIdentity {
        localType?: string;
      }

      model MyEncryption {
        customerManagedKeyEncryption?: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
        localKeyIdentity?: KeyEncryptionKeyIdentity;
      }

      @route("/test")
      op test(@body body: MyEncryption): void;
    `);

    const context = await createSdkContextForTester(program);

    // Check that no duplicate-client-name-warning is emitted when @clientName differentiates
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
    );

    expectDiagnosticEmpty(duplicateDiagnostics);
  });

  it("should emit warning for same-name enums in different namespaces", async () => {
    const { program } = await ArmTesterWithService.compile(`
      // Local enum with same name as ARM common type
      union KeyEncryptionKeyIdentityType {
        string,
        LocalType: "LocalType",
      }

      model MyModel {
        // References Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentityType
        armType?: Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentityType;
        // References local KeyEncryptionKeyIdentityType
        localType?: KeyEncryptionKeyIdentityType;
      }

      @route("/test")
      op test(@body body: MyModel): void;
    `);

    const context = await createSdkContextForTester(program);

    // Check if duplicate-client-name-warning is emitted for cross-namespace union duplicates
    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
    );

    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
        message:
          /Client name: "KeyEncryptionKeyIdentityType" in namespace .* conflicts with same name in namespace/,
      },
    ]);
  });
});

describe("user-defined duplicate names across namespaces", () => {
  it("should emit warning for same model name in different sub-namespaces", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      namespace SubA {
        model Foo { a: string; }
      }
      namespace SubB {
        model Foo { b: string; }
      }

      @route("/a")
      op getA(): SubA.Foo;

      @route("/b")
      op getB(): SubB.Foo;
    `);

    const context = await createSdkContextForTester(program);

    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
    );

    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
        message:
          /Client name: "Foo" in namespace "TestService\.SubB" conflicts with same name in namespace "TestService\.SubA"/,
      },
    ]);
  });

  it("should emit warning for model and enum with same name in different namespaces (cross-kind)", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      namespace SubA {
        model Foo { a: string; }
      }
      namespace SubB {
        enum Foo { A, B }
      }

      @route("/model")
      op getModel(): SubA.Foo;

      @route("/enum")
      op getEnum(@query foo: SubB.Foo): void;
    `);

    const context = await createSdkContextForTester(program);

    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
    );

    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
        message:
          /Client name: "Foo" in namespace "TestService\.SubB" conflicts with same name in namespace "TestService\.SubA"/,
      },
    ]);
  });

  it("should emit warning for same enum name in different sub-namespaces", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      namespace SubA {
        enum Status { Active, Inactive }
      }
      namespace SubB {
        enum Status { Pending, Complete }
      }

      @route("/a")
      op getA(@query status: SubA.Status): void;

      @route("/b")
      op getB(@query status: SubB.Status): void;
    `);

    const context = await createSdkContextForTester(program);

    const duplicateDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
    );

    expectDiagnostics(duplicateDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
        message:
          /Client name: "Status" in namespace "TestService\.SubB" conflicts with same name in namespace "TestService\.SubA"/,
      },
    ]);
  });

  it("should not emit warning when namespace flag collapses to same namespace (error instead)", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      namespace SubA {
        model Foo { a: string; }
      }
      namespace SubB {
        model Foo { b: string; }
      }

      @route("/a")
      op getA(): SubA.Foo;

      @route("/b")
      op getB(): SubB.Foo;
    `);

    const context = await createSdkContextForTester(program, { namespace: "MyService" });

    // With namespace flag, should get error (not warning) from validateNamesUnderNamespaces
    const errorDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name",
    );

    expectDiagnostics(errorDiagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
        message: /Client name: "Foo" is duplicated/,
      },
    ]);

    // Should NOT get warning since namespace flag handles it
    const warningDiagnostics = context.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/duplicate-client-name-warning",
    );
    expectDiagnosticEmpty(warningDiagnostics);
  });
});
