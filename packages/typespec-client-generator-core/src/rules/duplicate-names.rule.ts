import { createRule, paramMessage, Program, SemanticNodeListener } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import {
  SdkEnumType,
  SdkModelType,
  SdkNullableType,
  SdkUnionType,
  UsageFlags,
} from "../interfaces.js";
import { handleAllTypes } from "../types.js";

/**
 * Linter rule that detects duplicate type names across namespaces.
 * This catches cross-namespace name collisions that would cause issues for emitters
 * using flat type lists (e.g., two models named "Foo" in different namespaces).
 */
export const duplicateNamesRule = createRule({
  name: "duplicate-names",
  description:
    "Detects duplicate type names across namespaces that would cause naming conflicts in generated SDKs.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/duplicate-names",
  messages: {
    default: paramMessage`Client name "${"name"}" in namespace "${"namespace"}" conflicts with same name in namespace "${"existingNamespace"}"`,
  },
  create(context): SemanticNodeListener {
    return {
      root: (_program: Program) => {
        const tcgcContext = createTCGCContext(context.program, undefined, {
          mutateNamespace: false,
        });

        // Run the type-handling pass to populate __referencedTypeCache
        handleAllTypes(tcgcContext);

        // Build a map of name -> list of types with that name
        const nameToTypes = new Map<
          string,
          (SdkModelType | SdkEnumType | SdkUnionType | SdkNullableType)[]
        >();

        for (const sdkType of tcgcContext.__referencedTypeCache.values()) {
          // Skip types with no usage (not actually referenced)
          if (sdkType.usage === UsageFlags.None) {
            continue;
          }
          // Skip API version enums
          if (sdkType.kind === "enum" && (sdkType.usage & UsageFlags.ApiVersionEnum) !== 0) {
            continue;
          }
          // Skip nullable wrappers - check the inner type instead
          if (sdkType.kind === "nullable") {
            continue;
          }

          const existing = nameToTypes.get(sdkType.name);
          if (existing) {
            existing.push(sdkType);
          } else {
            nameToTypes.set(sdkType.name, [sdkType]);
          }
        }

        // Report diagnostics for duplicate names across different namespaces
        for (const [name, types] of nameToTypes) {
          if (types.length > 1) {
            const firstType = types[0];
            for (let i = 1; i < types.length; i++) {
              const type = types[i];
              // Only warn if the namespaces are different
              if (type.namespace !== firstType.namespace && type.__raw) {
                context.reportDiagnostic({
                  target: type.__raw,
                  format: {
                    name,
                    namespace: type.namespace,
                    existingNamespace: firstType.namespace,
                  },
                });
              }
            }
          }
        }
      },
    };
  },
});
