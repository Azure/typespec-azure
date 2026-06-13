import { Tester } from "#test/tester.js";
import { TesterInstance } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

let runner: TesterInstance;

beforeEach(async () => {
  runner = await Tester.createInstance();
});

describe("CustomerManagedKeyEncryptionV4 foundations type", () => {
  it("can be used in a service spec as a property type", async () => {
    const diagnostics = await runner.diagnose(
      `
      @armProviderNamespace
      @service
      namespace Microsoft.Contoso;

      model EncryptionConfig {
        customerManagedKey?: Azure.ResourceManager.Foundations.CustomerManagedKeyEncryptionV4;
      }
    `,
    );
    expectDiagnosticEmpty(diagnostics);
  });

  it("exposes keyEncryptionKeyIdentity and keyEncryptionKeyUrl properties", async () => {
    const diagnostics = await runner.diagnose(
      `
      @armProviderNamespace
      @service
      namespace Microsoft.Contoso;

      model EncryptionConfig {
        customerManagedKey?: Azure.ResourceManager.Foundations.CustomerManagedKeyEncryptionV4;
      }

      model UsesIdentity {
        identity?: Azure.ResourceManager.Foundations.KeyEncryptionKeyIdentityV4;
      }
    `,
    );
    expectDiagnosticEmpty(diagnostics);
  });

  it("KeyEncryptionKeyIdentityTypeV4 union can be referenced", async () => {
    const diagnostics = await runner.diagnose(
      `
      @armProviderNamespace
      @service
      namespace Microsoft.Contoso;

      model IdentityConfig {
        identityType?: Azure.ResourceManager.Foundations.KeyEncryptionKeyIdentityTypeV4;
      }
    `,
    );
    expectDiagnosticEmpty(diagnostics);
  });

  it("CustomerManagedKeyEncryption is internal and cannot be used outside Azure.ResourceManager", async () => {
    const diagnostics = await runner.diagnose(
      `
      @armProviderNamespace
      @service
      namespace Microsoft.Contoso;

      model EncryptionConfig {
        customerManagedKey?: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
      }
    `,
    );
    expectDiagnosticNotEmpty(diagnostics);
  });

  it("Encryption wrapper type remains public and usable", async () => {
    const diagnostics = await runner.diagnose(
      `
      @service(#{ title: "Test" })
      @versioned(Microsoft.Contoso.Versions)
      @armProviderNamespace
      namespace Microsoft.Contoso;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
        v4;
      }

      model ResourceProperties {
        encryption?: Azure.ResourceManager.CommonTypes.Encryption;
      }
    `,
    );
    expectDiagnosticEmpty(diagnostics);
  });
});

function expectDiagnosticEmpty(diagnostics: readonly any[]) {
  if (diagnostics.length > 0) {
    throw new Error(
      `Expected no diagnostics but got ${diagnostics.length}: ${diagnostics.map((d) => `${d.code}: ${d.message}`).join(", ")}`,
    );
  }
}

function expectDiagnosticNotEmpty(diagnostics: readonly any[]) {
  if (diagnostics.length === 0) {
    throw new Error("Expected diagnostics but got none");
  }
}
