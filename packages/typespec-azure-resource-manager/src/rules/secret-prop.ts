import {
  ModelProperty,
  UsageFlags,
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
  description: `Check that property with names indicating sensitive information(e.g. contains auth, password, token, secret, etc.) are marked with @secret decorator.`,
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
          property.type !== tk.builtin.url &&
          tk.type.isAssignableTo(property.type, tk.builtin.string) &&
          property.type.kind !== "Union" &&
          property.type.kind !== "Enum" &&
          !property.name.endsWith("Uri") &&
          !property.name.endsWith("Url") &&
          !property.name.endsWith("Name") &&
          !property.name.endsWith("Type") &&
          !property.name.endsWith("Id") &&
          !property.name.endsWith("ID") &&
          !isKeyValuePairKeyProp(property)
        ) {
          context.reportDiagnostic({
            target: property,
            format: {
              propertyName: property.name,
            },
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

function isPotentialSensitiveProperty(propertyName: string): boolean {
  const upperName = propertyName.toUpperCase();
  return sensitiveKeywords.some((keyword) => upperName.includes(keyword));
}
