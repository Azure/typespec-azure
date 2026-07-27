import { createRule, paramMessage, type Model, type ModelProperty } from "@typespec/compiler";
import { getArmResources } from "@azure-tools/typespec-azure-resource-manager";

export const tagsAreNotAllowedForProxyResourcesRule = createRule({
  name: "tags-are-not-allowed-for-proxy-resources",
  description:
    "Proxy ARM resources must not declare a top-level tags property in their properties bag.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Proxy resource '${"resourceName"}' must not declare top-level \`tags\` in its properties bag. Use a tracked resource if tags are required.`,
  },
  create(context) {
    return {
      root: () => {
        for (const armResource of getArmResources(context.program)) {
          if (armResource.kind !== "Proxy") {
            continue;
          }

          const propertiesModel = getResourcePropertiesModel(armResource.typespecType);
          const tagsProperty = propertiesModel && getPropertyInHierarchy(propertiesModel, "tags");
          if (!tagsProperty) {
            continue;
          }

          context.reportDiagnostic({
            target: tagsProperty,
            format: {
              resourceName: armResource.name,
            },
          });
        }
      },
    };
  },
});

function getResourcePropertiesModel(resourceModel: Model): Model | undefined {
  const propertiesProperty = getPropertyInHierarchy(resourceModel, "properties");
  return propertiesProperty?.type.kind === "Model" ? propertiesProperty.type : undefined;
}

function getPropertyInHierarchy(model: Model, propertyName: string): ModelProperty | undefined {
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    const property = current.properties.get(propertyName);
    if (property !== undefined) {
      return property;
    }
  }

  return undefined;
}
