import { createRule, paramMessage, type Model, type ModelProperty } from "@typespec/compiler";
import { getArmResources } from "@azure-tools/typespec-azure-resource-manager";

const unsupportedPatchProperties = new Set(["id", "name", "type"]);

export const unsupportedPatchPropertiesRule = createRule({
  name: "unsupported-patch-properties",
  description:
    "ARM PATCH request bodies must not contain writable top-level id, name, or type properties.",
  severity: "warning",
  messages: {
    default:
      paramMessage`PATCH request body property '${"propertyName"}' is not patchable and should be removed or made read-only/immutable.`,
  },
  create(context) {
    return {
      root: () => {
        for (const armResource of getArmResources(context.program)) {
          const patchBody = armResource.operations.lifecycle.update?.httpOperation.parameters.body
            ?.type;
          if (patchBody?.kind !== "Model") {
            continue;
          }

          for (const property of getTopLevelProperties(patchBody)) {
            if (!unsupportedPatchProperties.has(property.name)) {
              continue;
            }

            context.reportDiagnostic({
              target: property,
              format: {
                propertyName: property.name,
              },
            });
          }
        }
      },
    };
  },
});

function getTopLevelProperties(model: Model): ModelProperty[] {
  const properties = new Map<string, ModelProperty>();

  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    for (const property of current.properties.values()) {
      if (!properties.has(property.name)) {
        properties.set(property.name, property);
      }
    }
  }

  return [...properties.values()];
}
