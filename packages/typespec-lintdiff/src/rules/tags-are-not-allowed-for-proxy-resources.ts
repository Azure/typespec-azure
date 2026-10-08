import { getArmResources } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  paramMessage,
  resolveEncodedName,
  type Model,
  type ModelProperty,
  type Program,
} from "@typespec/compiler";

export const tagsAreNotAllowedForProxyResourcesRule = createRule({
  name: "tags-are-not-allowed-for-proxy-resources",
  description:
    "Proxy ARM resources must not declare a tags property on the resource envelope or in their properties bag.",
  severity: "warning",
  messages: {
    default: paramMessage`Proxy resource '${"resourceName"}' must not declare \`tags\` on its resource envelope or in its properties bag. Use a tracked resource if tags are required.`,
  },
  create(context) {
    return {
      root: () => {
        for (const armResource of getArmResources(context.program)) {
          if (armResource.kind !== "Proxy") {
            continue;
          }

          const resourceTags = getPropertyInHierarchy(
            context.program,
            armResource.typespecType,
            "tags",
          );
          const propertiesModel = getResourcePropertiesModel(
            context.program,
            armResource.typespecType,
          );
          const propertiesTags =
            propertiesModel && getPropertyInHierarchy(context.program, propertiesModel, "tags");

          for (const tagsProperty of [resourceTags, propertiesTags]) {
            if (tagsProperty) {
              context.reportDiagnostic({
                target: tagsProperty,
                format: {
                  resourceName: armResource.name,
                },
              });
            }
          }
        }
      },
    };
  },
});

function getResourcePropertiesModel(program: Program, resourceModel: Model): Model | undefined {
  const propertiesProperty = getPropertyInHierarchy(program, resourceModel, "properties");
  return propertiesProperty?.type.kind === "Model" ? propertiesProperty.type : undefined;
}

function getPropertyInHierarchy(
  program: Program,
  model: Model,
  jsonName: string,
): ModelProperty | undefined {
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    for (const property of current.properties.values()) {
      if (resolveEncodedName(program, property, "application/json") === jsonName) {
        return property;
      }
    }
  }

  return undefined;
}
