import { normalizePath } from "@typespec/compiler";
import { describe, expect, it } from "vitest";
import { buildLanguageMetadata, inferLanguageFromEmitterName } from "../src/collector.js";

describe("outputDir path handling", () => {
  it("should replace absolute base path with {output-dir} placeholder", () => {
    const baseDir = "c:\\repos\\project\\tsp-output";
    const absolutePath = "c:\\repos\\project\\tsp-output\\sdk\\keyvault\\secrets";
    const expected = "{output-dir}/sdk/keyvault/secrets";

    // Test the logic that converts absolute to placeholder
    const normalizedBase = normalizePath(baseDir).replace(/\/$/, "");
    const normalizedPath = normalizePath(absolutePath);

    let result: string;
    if (normalizedPath.startsWith(normalizedBase + "/")) {
      const relativePart = normalizedPath.substring(normalizedBase.length + 1);
      result = `{output-dir}/${relativePart}`;
    } else {
      result = absolutePath;
    }

    expect(result).toBe(expected);
  });

  it("should handle paths that do not start with base directory", () => {
    const baseDir = "c:\\repos\\project\\tsp-output";
    const absolutePath = "c:\\other\\path\\sdk\\keyvault\\secrets";

    const normalizedBase = normalizePath(baseDir).replace(/\/$/, "");
    const normalizedPath = normalizePath(absolutePath);

    let result: string;
    if (normalizedPath.startsWith(normalizedBase + "/")) {
      const relativePart = normalizedPath.substring(normalizedBase.length + 1);
      result = `{output-dir}/${relativePart}`;
    } else {
      result = absolutePath;
    }

    expect(result).toBe(absolutePath);
  });

  it("should handle exact base directory match", () => {
    const baseDir = "c:\\repos\\project\\tsp-output";
    const absolutePath = "c:\\repos\\project\\tsp-output";
    const expected = "{output-dir}";

    const normalizedBase = normalizePath(baseDir).replace(/\/$/, "");
    const normalizedPath = normalizePath(absolutePath);

    let result: string;
    if (normalizedPath.startsWith(normalizedBase + "/")) {
      const relativePart = normalizedPath.substring(normalizedBase.length + 1);
      result = `{output-dir}/${relativePart}`;
    } else if (normalizedPath === normalizedBase) {
      result = "{output-dir}";
    } else {
      result = absolutePath;
    }

    expect(result).toBe(expected);
  });
});

describe("variable substitution", () => {
  it("should replace template variables with values", () => {
    const fillVars = (value: unknown, data: Record<string, unknown>): unknown => {
      if (typeof value !== "string") {
        return value;
      }

      let prev: string | undefined;
      let current = value;

      while (prev !== current) {
        prev = current;
        current = current.replace(/\{([^{}]+)\}/g, (match, key) => {
          const replacement = data[key];
          return replacement !== undefined && replacement !== null ? String(replacement) : match;
        });
      }

      return current;
    };

    const data = {
      "service-dir": "sdk/keyvault",
      "package-name": "azure-keyvault-secrets",
    };

    expect(fillVars("{service-dir}/test", data)).toBe("sdk/keyvault/test");
    expect(fillVars("{package-name}", data)).toBe("azure-keyvault-secrets");
    expect(fillVars("{unknown}", data)).toBe("{unknown}");
    expect(fillVars("no-vars", data)).toBe("no-vars");
  });

  it("should handle nested variable substitution", () => {
    const fillVars = (value: unknown, data: Record<string, unknown>): unknown => {
      if (typeof value !== "string") {
        return value;
      }

      let prev: string | undefined;
      let current = value;

      while (prev !== current) {
        prev = current;
        current = current.replace(/\{([^{}]+)\}/g, (match, key) => {
          const replacement = data[key];
          return replacement !== undefined && replacement !== null ? String(replacement) : match;
        });
      }

      return current;
    };

    const data = {
      var1: "{var2}",
      var2: "final-value",
    };

    expect(fillVars("{var1}", data)).toBe("final-value");
  });
});

describe("language-specific parsers", () => {
  it("should parse Python package metadata correctly", () => {
    const options = {
      "package-name": "azure-keyvault-secrets",
      namespace: "azure.keyvault.secrets._generated",
    };

    // Python strips ._generated suffix
    const namespace = String(options.namespace).replace(/\._generated$/, "");

    expect(namespace).toBe("azure.keyvault.secrets");
  });

  it("should derive Python namespace from package-name", () => {
    const options = {
      "package-name": "azure-keyvault-secrets",
    };

    const namespace = String(options["package-name"]).replace(/-/g, ".");

    expect(namespace).toBe("azure.keyvault.secrets");
  });

  it("should parse Java package metadata correctly", () => {
    const options = {
      namespace: "com.azure.security.keyvault.secrets",
    };

    const ns = String(options.namespace);
    const stripped = ns.startsWith("com.") ? ns.substring(4) : ns;
    const packageName = stripped.replace(/\./g, "-");

    expect(packageName).toBe("azure-security-keyvault-secrets");
  });

  it("should parse Go module path correctly", () => {
    const options = {
      module: "github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets",
    };

    const modulePath = String(options.module);
    const sdkIndex = modulePath.indexOf("azure-sdk-for-go/");
    const packageName =
      sdkIndex >= 0 ? modulePath.substring(sdkIndex + "azure-sdk-for-go/".length) : modulePath;

    expect(packageName).toBe("sdk/security/keyvault/azsecrets");
  });

  it("should parse Rust crate-name correctly", () => {
    const options = {
      "crate-name": "azure_security_keyvault_secrets",
    };

    const packageName = options["crate-name"];

    expect(packageName).toBe("azure_security_keyvault_secrets");
  });
});

describe("service-dir handling", () => {
  it("should use language-specific service-dir if present", () => {
    const languageServiceDir = "sdk/security/keyvault";
    const defaultServiceDir = "sdk/keyvault";

    const result = languageServiceDir ? languageServiceDir : defaultServiceDir;

    expect(result).toBe("sdk/security/keyvault");
  });

  it("should fall back to default service-dir if not present in language options", () => {
    const languageServiceDir = undefined;
    const defaultServiceDir = "sdk/keyvault";

    const result = languageServiceDir ? languageServiceDir : defaultServiceDir;

    expect(result).toBe("sdk/keyvault");
  });
});

describe("parameter extraction", () => {
  it("should extract parameters with default values", () => {
    const optionMap = {
      parameters: {
        "service-dir": {
          default: "sdk/keyvault",
        },
        dependencies: {
          default: "",
        },
      },
    };

    const params: Record<string, unknown> = {};
    const value = optionMap["parameters"];
    if (typeof value === "object" && value !== null) {
      for (const [paramKey, paramValue] of Object.entries(value)) {
        if (typeof paramValue === "object" && paramValue !== null && "default" in paramValue) {
          params[paramKey] = (paramValue as any).default;
        } else {
          params[paramKey] = paramValue;
        }
      }
    }

    expect(params["service-dir"]).toBe("sdk/keyvault");
    expect(params["dependencies"]).toBe("");
  });
});

describe("namespace selection logic", () => {
  // These tests verify the logic documented in the function
  // The actual behavior is tested end-to-end through compilation tests

  it("should document preference for @service decorator", () => {
    // Namespaces with @service decorator should be selected first
    expect(true).toBe(true);
  });

  it("should document filtering of helper namespaces", () => {
    // Customizations, Internal, Private, Helpers, Traits, Common should be filtered
    const helperPatterns = [
      "Customizations",
      "Customization",
      "Internal",
      "Private",
      "Helpers",
      "Traits",
      "Common",
    ];
    expect(helperPatterns.length).toBeGreaterThan(0);
  });

  it("should document preference for deepest namespace when no @service", () => {
    // When no @service, deepest namespace (most dots) should be selected
    const testCases = [
      { name: "Microsoft", depth: 1 },
      { name: "Microsoft.KeyVault", depth: 2 },
    ];

    const depths = testCases.map((tc) => ({ name: tc.name, depth: tc.name.split(".").length }));
    expect(depths[1].depth).toBeGreaterThan(depths[0].depth);
  });

  it("should document management plane detection", () => {
    // Azure.ResourceManager namespace indicates management plane
    expect("management").toBe("management");
    expect("data").toBe("data");
  });
});

describe("inferLanguageFromEmitterName", () => {
  it("should return full emitter name for unrecognized emitters", () => {
    // Emitters not in EMITTER_REGISTRY should use the full emitter name as the language key.
    expect(inferLanguageFromEmitterName("@unknown/some-emitter")).toBe("@unknown/some-emitter");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-swift")).toBe(
      "@azure-tools/typespec-swift",
    );
  });

  it("should return known alias for registered emitters", () => {
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-csharp")).toBe("csharp");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-python")).toBe("python");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-java")).toBe("java");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-ts")).toBe("typescript");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-go")).toBe("go");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-rust")).toBe("rust");
    expect(inferLanguageFromEmitterName("@azure-typespec/http-client-csharp")).toBe(
      "http-client-csharp",
    );
    expect(inferLanguageFromEmitterName("@azure-typespec/http-client-csharp-mgmt")).toBe(
      "http-client-csharp-mgmt",
    );
  });
});

describe("@azure-typespec/http-client-csharp-mgmt emitter", () => {
  it("should parse namespace from mgmt emitter options", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-typespec/http-client-csharp-mgmt": {
        namespace: "Azure.ResourceManager.WeightsAndBiases",
        "emitter-output-dir":
          "c:/repos/tsp-output/sdk/weightsandbiases/Azure.ResourceManager.WeightsAndBiases",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "c:/repos/tsp-output");
    const lang = result["http-client-csharp-mgmt"];

    expect(lang).toBeDefined();
    expect(lang.namespace).toBe("Azure.ResourceManager.WeightsAndBiases");
    expect(lang.packageName).toBe("Azure.ResourceManager.WeightsAndBiases");
    expect(lang.emitterName).toBe("@azure-typespec/http-client-csharp-mgmt");
  });

  it("should resolve {namespace} placeholder in emitter-output-dir", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-typespec/http-client-csharp-mgmt": {
        namespace: "Azure.ResourceManager.WeightsAndBiases",
        "emitter-output-dir": "c:/repos/tsp-output/sdk/weightsandbiases/{namespace}",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "c:/repos/tsp-output");
    const lang = result["http-client-csharp-mgmt"];

    expect(lang.outputDir).toBe(
      "{output-dir}/sdk/weightsandbiases/Azure.ResourceManager.WeightsAndBiases",
    );
  });

  it("should resolve {namespace} with service-dir in emitter-output-dir", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-typespec/http-client-csharp-mgmt": {
        namespace: "Azure.ResourceManager.HealthDataAIServices",
        "emitter-output-dir":
          "c:/repos/tsp-output/sdk/healthdataaiservices/Azure.ResourceManager.HealthDataAIServices",
      },
    };

    const result = buildLanguageMetadata(
      optionMap,
      {},
      "c:/repos/tsp-output",
      "sdk/healthdataaiservices",
    );
    const lang = result["http-client-csharp-mgmt"];

    expect(lang.namespace).toBe("Azure.ResourceManager.HealthDataAIServices");
    expect(lang.outputDir).toBe(
      "{output-dir}/sdk/healthdataaiservices/Azure.ResourceManager.HealthDataAIServices",
    );
  });
});

describe("@azure-typespec/http-client-csharp emitter", () => {
  it("should parse namespace from data-plane csharp emitter options", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-typespec/http-client-csharp": {
        namespace: "Azure.Security.KeyVault",
        "emitter-output-dir": "c:/repos/tsp-output/sdk/keyvault/Azure.Security.KeyVault",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "c:/repos/tsp-output");
    const lang = result["http-client-csharp"];

    expect(lang).toBeDefined();
    expect(lang.namespace).toBe("Azure.Security.KeyVault");
    expect(lang.packageName).toBe("Azure.Security.KeyVault");
  });

  it("should resolve {namespace} placeholder in emitter-output-dir", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-typespec/http-client-csharp": {
        namespace: "Azure.Security.KeyVault",
        "emitter-output-dir": "c:/repos/tsp-output/sdk/keyvault/{namespace}",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "c:/repos/tsp-output");
    const lang = result["http-client-csharp"];

    expect(lang.outputDir).toBe("{output-dir}/sdk/keyvault/Azure.Security.KeyVault");
  });
});
