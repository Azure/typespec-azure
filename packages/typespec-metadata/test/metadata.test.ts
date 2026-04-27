import { describe, expect, it } from "vitest";
import type {
  LanguagePackageMetadata,
  MetadataSnapshot,
  TypeSpecMetadata,
} from "../src/metadata.js";

describe("MetadataSnapshot structure", () => {
  it("should have required top-level fields", () => {
    const snapshot: MetadataSnapshot = {
      emitterVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      typespec: {
        namespace: "MyService",
        type: "data",
      },
      languages: {},
    };

    expect(snapshot).toHaveProperty("emitterVersion");
    expect(snapshot).toHaveProperty("generatedAt");
    expect(snapshot).toHaveProperty("typespec");
    expect(snapshot).toHaveProperty("languages");
  });

  it("should format generatedAt as ISO timestamp", () => {
    const snapshot: MetadataSnapshot = {
      emitterVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      typespec: {
        namespace: "MyService",
        type: "data",
      },
      languages: {},
    };

    expect(snapshot.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("should have sourceConfigPath when available", () => {
    const snapshot: MetadataSnapshot = {
      emitterVersion: "0.1.0",
      generatedAt: new Date().toISOString(),
      typespec: {
        namespace: "MyService",
        type: "data",
      },
      languages: {},
      sourceConfigPath: "C:/path/to/tspconfig.yaml",
    };

    expect(snapshot.sourceConfigPath).toBe("C:/path/to/tspconfig.yaml");
  });
});

describe("TypeSpecMetadata structure", () => {
  it("should contain namespace and type", () => {
    const typespec: TypeSpecMetadata = {
      namespace: "MyService",
      type: "data",
    };

    expect(typespec.namespace).toBe("MyService");
    expect(typespec.type).toBe("data");
  });

  it("should support optional documentation", () => {
    const typespec: TypeSpecMetadata = {
      namespace: "MyService",
      documentation: "My service documentation",
      type: "management",
    };

    expect(typespec.namespace).toBe("MyService");
    expect(typespec.documentation).toBe("My service documentation");
    expect(typespec.type).toBe("management");
  });
});

describe("LanguagePackageMetadata structure", () => {
  it("should use language name as dictionary key", () => {
    const languages: Record<string, LanguagePackageMetadata[]> = {
      python: [
        {
          emitterName: "@azure-tools/typespec-python",
          packageName: "azure-keyvault-secrets",
          namespace: "azure.keyvault.secrets",
          outputDir: "{output-dir}/sdk/keyvault/azure-keyvault-secrets",
          flavor: "azure",
          serviceDir: "sdk/keyvault",
        },
      ],
    };

    expect(languages).toHaveProperty("python");
    expect(languages.python[0].packageName).toBe("azure-keyvault-secrets");
  });

  it("should support multiple languages", () => {
    const languages: Record<string, LanguagePackageMetadata[]> = {
      python: [
        {
          emitterName: "@azure-tools/typespec-python",
          packageName: "azure-keyvault-secrets",
          namespace: "azure.keyvault.secrets",
          outputDir: "{output-dir}/sdk/keyvault/azure-keyvault-secrets",
          flavor: "azure",
          serviceDir: "sdk/keyvault",
        },
      ],
      java: [
        {
          emitterName: "@azure-tools/typespec-java",
          packageName: "com.azure:azure-security-keyvault-secrets",
          namespace: "com.azure.security.keyvault.secrets",
          outputDir: "{output-dir}/sdk/keyvault/azure-security-keyvault-secrets",
          flavor: "azure",
          serviceDir: "sdk/keyvault",
        },
      ],
    };

    expect(Object.keys(languages)).toHaveLength(2);
    expect(languages).toHaveProperty("python");
    expect(languages).toHaveProperty("java");
  });

  it("should support multiple emitters under the same language", () => {
    const languages: Record<string, LanguagePackageMetadata[]> = {
      csharp: [
        {
          emitterName: "@typespec/http-client-csharp",
          packageName: "Azure.AI.Projects",
          outputDir: "{output-dir}/sdk/ai/Azure.AI.Projects",
          serviceDir: "sdk/ai",
        },
        {
          emitterName: "@azure-tools/typespec-csharp",
          packageName: "Azure.AI.Agents.Contracts.V2",
          namespace: "Azure.AI.Agents.Contracts.V2",
          outputDir: "{output-dir}/sdk/ai/Azure.AI.Agents.Contracts.V2",
          flavor: "azure",
          serviceDir: "sdk/ai",
        },
      ],
    };

    expect(languages.csharp).toHaveLength(2);
    expect(languages.csharp[0].emitterName).toBe("@typespec/http-client-csharp");
    expect(languages.csharp[1].emitterName).toBe("@azure-tools/typespec-csharp");
  });

  it("should use {output-dir} placeholder in outputDir", () => {
    const lang: LanguagePackageMetadata = {
      emitterName: "@azure-tools/typespec-python",
      packageName: "azure-keyvault-secrets",
      outputDir: "{output-dir}/sdk/keyvault/azure-keyvault-secrets",
    };

    expect(lang.outputDir).toContain("{output-dir}");
    expect(lang.outputDir).not.toContain("c:/");
    expect(lang.outputDir).not.toContain("C:/");
  });

  it("should support optional fields", () => {
    const minimal: LanguagePackageMetadata = {
      emitterName: "@azure-tools/typespec-python",
    };

    expect(minimal.emitterName).toBe("@azure-tools/typespec-python");
    expect(minimal.packageName).toBeUndefined();
    expect(minimal.namespace).toBeUndefined();
    expect(minimal.outputDir).toBeUndefined();
    expect(minimal.flavor).toBeUndefined();
    expect(minimal.serviceDir).toBeUndefined();
  });

  it("should support language-specific service-dir", () => {
    const languages: Record<string, LanguagePackageMetadata[]> = {
      go: [
        {
          emitterName: "@azure-tools/typespec-go",
          packageName: "sdk/security/keyvault/azsecrets",
          namespace: "sdk/security/keyvault/azsecrets",
          outputDir: "{output-dir}/sdk/security/keyvault/azsecrets",
          serviceDir: "sdk/security/keyvault", // Different from other languages
        },
      ],
      python: [
        {
          emitterName: "@azure-tools/typespec-python",
          packageName: "azure-keyvault-secrets",
          namespace: "azure.keyvault.secrets",
          outputDir: "{output-dir}/sdk/keyvault/azure-keyvault-secrets",
          serviceDir: "sdk/keyvault", // Default service-dir
        },
      ],
    };

    expect(languages.go[0].serviceDir).toBe("sdk/security/keyvault");
    expect(languages.python[0].serviceDir).toBe("sdk/keyvault");
  });
});

describe("Complete snapshot example", () => {
  it("should create a valid complete snapshot", () => {
    const snapshot: MetadataSnapshot = {
      emitterVersion: "0.1.0",
      generatedAt: "2026-01-07T18:00:00.000Z",
      typespec: {
        namespace: "KeyVault",
        documentation:
          "The key vault client performs cryptographic key operations and vault operations against the Key Vault service.",
        type: "data",
      },
      languages: {
        python: [
          {
            emitterName: "@azure-tools/typespec-python",
            packageName: "azure-keyvault-secrets",
            namespace: "azure.keyvault.secrets",
            outputDir: "{output-dir}/sdk/keyvault/azure-keyvault-secrets",
            flavor: "azure",
            serviceDir: "sdk/keyvault",
          },
        ],
        java: [
          {
            emitterName: "@azure-tools/typespec-java",
            packageName: "com.azure:azure-security-keyvault-secrets",
            namespace: "com.azure.security.keyvault.secrets",
            outputDir: "{output-dir}/sdk/keyvault/azure-security-keyvault-secrets",
            flavor: "azure",
            serviceDir: "sdk/keyvault",
          },
        ],
        typescript: [
          {
            emitterName: "@azure-tools/typespec-ts",
            packageName: "@azure/keyvault-secrets",
            namespace: "@azure/keyvault-secrets",
            outputDir: "{output-dir}/sdk/keyvault/keyvault-secrets",
            flavor: "azure",
            serviceDir: "sdk/keyvault",
          },
        ],
      },
      sourceConfigPath:
        "C:/repos/azure-rest-api-specs/specification/keyvault/Security.KeyVault.Secrets/tspconfig.yaml",
    };

    // Validate structure
    expect(snapshot.emitterVersion).toBeTruthy();
    expect(snapshot.generatedAt).toBeTruthy();
    expect(snapshot.typespec.namespace).toBe("KeyVault");
    expect(snapshot.typespec.type).toBe("data");
    expect(Object.keys(snapshot.languages)).toHaveLength(3);
    expect(snapshot.sourceConfigPath).toBeTruthy();

    // Validate no absolute paths in output directories
    Object.values(snapshot.languages).forEach((langs) => {
      langs.forEach((lang) => {
        if (lang.outputDir) {
          expect(lang.outputDir).toContain("{output-dir}");
        }
      });
    });
  });
});
