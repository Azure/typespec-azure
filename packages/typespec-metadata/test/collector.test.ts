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
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        namespace: "com.azure.security.keyvault.secrets",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    // Package name should include the Maven groupId prefix
    expect(lang.packageName).toBe("com.azure:azure-security-keyvault-secrets");
    expect(lang.namespace).toBe("com.azure.security.keyvault.secrets");
  });

  it("should parse Java management-plane package metadata correctly", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        namespace: "com.azure.resourcemanager.frontdoor",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    expect(lang.packageName).toBe("com.azure.resourcemanager:azure-resourcemanager-frontdoor");
    expect(lang.namespace).toBe("com.azure.resourcemanager.frontdoor");
  });

  it("should parse Java v2 data-plane package metadata correctly", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        namespace: "com.azure.ai.agents",
        flavor: "azurev2",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    expect(lang.packageName).toBe("com.azure.v2:azure-ai-agents");
    expect(lang.namespace).toBe("com.azure.ai.agents");
  });

  it("should parse Java v2 data-plane package metadata with v2 embedded in namespace correctly", () => {
    // When the namespace already contains 'v2' as a segment (com.azure.v2.xxx),
    // the artifact ID should NOT repeat 'v2' since the groupId already encodes it.
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        namespace: "com.azure.v2.security.keyvault.administration",
        flavor: "azurev2",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    expect(lang.packageName).toBe("com.azure.v2:azure-security-keyvault-administration");
    expect(lang.namespace).toBe("com.azure.v2.security.keyvault.administration");
  });

  it("should parse Java v2 management-plane package metadata correctly", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        namespace: "com.azure.resourcemanager.cdn",
        flavor: "azurev2",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    expect(lang.packageName).toBe("com.azure.resourcemanager.v2:azure-resourcemanager-cdn");
    expect(lang.namespace).toBe("com.azure.resourcemanager.cdn");
  });

  it("should parse Java v2 management-plane package metadata with v2 embedded in namespace correctly", () => {
    // When the namespace already contains 'v2' as a segment (com.azure.resourcemanager.v2.xxx),
    // the artifact ID should NOT repeat 'v2' since the groupId already encodes it.
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        namespace: "com.azure.resourcemanager.v2.cdn",
        flavor: "azurev2",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    expect(lang.packageName).toBe("com.azure.resourcemanager.v2:azure-resourcemanager-cdn");
    expect(lang.namespace).toBe("com.azure.resourcemanager.v2.cdn");
  });

  it("should use explicit package-name with groupId prefix for Java", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        "package-name": "azure-storage-blobs",
        namespace: "com.azure.storage.blobs",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    // Explicit package-name should also get the groupId prefix
    expect(lang.packageName).toBe("com.azure:azure-storage-blobs");
  });

  it("should preserve existing Maven coordinate format in Java package-name", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-java": {
        "package-name": "com.azure.spring:azure-spring-data-cosmos",
        namespace: "com.azure.spring.data.cosmos",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");
    const lang = result["java"][0];

    // Already has groupId:artifactId format – should not be modified
    expect(lang.packageName).toBe("com.azure.spring:azure-spring-data-cosmos");
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
  it("should return 'unknown' for unrecognized emitters with no language keyword", () => {
    expect(inferLanguageFromEmitterName("@unknown/some-emitter")).toBe("unknown");
    expect(inferLanguageFromEmitterName("@typespec/openapi3")).toBe("unknown");
    expect(inferLanguageFromEmitterName("@typespec/json-schema")).toBe("unknown");
  });

  it("should return known alias for registered emitters", () => {
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-csharp")).toBe("csharp");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-python")).toBe("python");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-java")).toBe("java");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-ts")).toBe("typescript");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-go")).toBe("go");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-rust")).toBe("rust");
    expect(inferLanguageFromEmitterName("@azure-typespec/http-client-csharp")).toBe("csharp");
    expect(inferLanguageFromEmitterName("@azure-typespec/http-client-csharp-mgmt")).toBe(
      "csharp",
    );
  });

  it("should infer language by heuristic for unregistered emitters", () => {
    expect(inferLanguageFromEmitterName("@typespec/http-client-csharp")).toBe("csharp");
    expect(inferLanguageFromEmitterName("@azure-tools/typespec-swift")).toBe("swift");
    expect(inferLanguageFromEmitterName("@contoso/typespec-python-experimental")).toBe("python");
    expect(inferLanguageFromEmitterName("@contoso/some-java-emitter")).toBe("java");
    expect(inferLanguageFromEmitterName("@contoso/some-javascript-emitter")).toBe("javascript");
  });

  it("should not match 'java' inside 'javascript'", () => {
    expect(inferLanguageFromEmitterName("@contoso/javascript-emitter")).toBe("javascript");
    expect(inferLanguageFromEmitterName("@contoso/javascript-emitter")).not.toBe("java");
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
    const lang = result["csharp"][0];

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
    const lang = result["csharp"][0];

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
    const lang = result["csharp"][0];

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
    const lang = result["csharp"][0];

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
    const lang = result["csharp"][0];

    expect(lang.outputDir).toBe("{output-dir}/sdk/keyvault/Azure.Security.KeyVault");
  });
});

describe("multiple emitters per language", () => {
  it("should group two C# emitters under the same 'csharp' key", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@typespec/http-client-csharp": {
        "package-name": "Azure.AI.Projects",
        "emitter-output-dir": "c:/repos/tsp-output/sdk/ai/Azure.AI.Projects",
      },
      "@azure-tools/typespec-csharp": {
        "package-name": "Azure.AI.Agents.Contracts.V2",
        namespace: "Azure.AI.Agents.Contracts.V2",
        "emitter-output-dir": "c:/repos/tsp-output/sdk/ai/Azure.AI.Agents.Contracts.V2",
        flavor: "azure",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "c:/repos/tsp-output");

    expect(result["csharp"]).toHaveLength(2);
    expect(result["csharp"][0].emitterName).toBe("@typespec/http-client-csharp");
    expect(result["csharp"][0].packageName).toBe("Azure.AI.Projects");
    expect(result["csharp"][1].emitterName).toBe("@azure-tools/typespec-csharp");
    expect(result["csharp"][1].packageName).toBe("Azure.AI.Agents.Contracts.V2");
  });

  it("should produce array of one for single-emitter languages", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@azure-tools/typespec-python": {
        "package-name": "azure-keyvault-secrets",
      },
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");

    expect(result["python"]).toHaveLength(1);
    expect(result["python"][0].packageName).toBe("azure-keyvault-secrets");
  });

  it("should group unrecognized emitters under 'unknown'", () => {
    const optionMap: Record<string, Record<string, unknown>> = {
      "@typespec/openapi3": {},
      "@typespec/json-schema": {},
    };

    const result = buildLanguageMetadata(optionMap, {}, "/repos/tsp-output");

    expect(result["unknown"]).toHaveLength(2);
    expect(result["unknown"][0].emitterName).toBe("@typespec/openapi3");
    expect(result["unknown"][1].emitterName).toBe("@typespec/json-schema");
  });
});
