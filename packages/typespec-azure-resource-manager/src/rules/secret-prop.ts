import {
  ModelProperty,
  UsageFlags,
  createAddDecoratorCodeFix,
  createRule,
  isSecret,
  paramMessage,
  resolveUsages,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";

function isKeyValuePairKeyProp(property: ModelProperty): boolean {
  return (
    property.name === "key" &&
    property.model?.properties.has("value") === true &&
    property.model?.properties.size === 2
  );
}
export const secretProprule = createRule({
  name: "secret-prop",
  description: `RPC-v1-13: Check that property with names indicating sensitive information(e.g. contains auth, password, token, secret, etc.) are marked with @secret decorator.`,
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/secret-prop",
  messages: {
    default: paramMessage`Property '${"propertyName"}' looks like it contains sensitive information. Consider marking it with @secret decorator to ensure it is handled securely.`,
  },
  create(context) {
    const usages = resolveUsages(context.program.getGlobalNamespaceType());
    return {
      modelProperty: (property: ModelProperty) => {
        if (!property.model || !usages.isUsedAs(property.model, UsageFlags.Output)) {
          return;
        }
        const tk = $(context.program);
        if (
          isPotentialSensitiveProperty(property.name) &&
          !isSecret(context.program, property) &&
          !isSecret(context.program, property.type) &&
          property.type === tk.builtin.string &&
          !isKeyValuePairKeyProp(property)
        ) {
          context.reportDiagnostic({
            target: property,
            format: {
              propertyName: property.name,
            },
            codefixes: [createAddDecoratorCodeFix(property, "secret")],
          });
        }
      },
    };
  },
});

const sensitiveKeywords = [
  "access",
  "credential",
  "secret",
  "password",
  "key",
  "token",
  "auth",
  "connection",
].map((keyword) => keyword.toUpperCase());

/** Set of keyword that shouldn't be flagged */
const excludeKeywords = ["publicKey"].map((keyword) => keyword.toUpperCase());
function isPotentialSensitiveProperty(propertyName: string): boolean {
  const upperName = propertyName.toUpperCase();
  return (
    sensitiveKeywords.some((keyword) => upperName.endsWith(keyword)) &&
    !excludeKeywords.some((keyword) => upperName.endsWith(keyword))
  );
}
