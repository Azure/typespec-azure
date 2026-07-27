import {
  createRule,
  getProperty,
  paramMessage,
  type Model,
  type ModelProperty,
} from "@typespec/compiler";
import {
  getArmResources,
  type ArmResourceDetails,
} from "@azure-tools/typespec-azure-resource-manager";

export const consistentPatchPropertiesRule = createRule({
  name: "consistent-patch-properties",
  description:
    "ARM PATCH body properties must exist in the resource model at the same nesting level.",
  severity: "warning",
  messages: {
    default:
      paramMessage`The property '${"propertyName"}' in the request body either does not appear in the resource model or is nested at the wrong level.`,
  },
  create(context) {
    return {
      root: (program) => {
        for (const armResource of getArmResources(program)) {
          const patchBody = armResource.operations.lifecycle.update?.httpOperation.parameters.body
            ?.type;
          if (patchBody?.kind !== "Model") {
            continue;
          }

          for (const invalidProperty of findInvalidPatchProperties(
            patchBody,
            armResource.typespecType,
          )) {
            context.reportDiagnostic({
              target: invalidProperty.property,
              format: {
                propertyName: invalidProperty.path.join("."),
              },
            });
          }
        }
      },
    };
  },
});

function findInvalidPatchProperties(
  patchModel: Model,
  resourceModel: Model,
  path: string[] = [],
  visited: Set<Model> = new Set(),
): Array<{ path: string[]; property: ModelProperty }> {
  if (visited.has(patchModel)) {
    return [];
  }
  visited.add(patchModel);

  const invalidProperties: Array<{ path: string[]; property: ModelProperty }> = [];

  for (const patchProperty of getModelProperties(patchModel)) {
    const currentPath = [...path, patchProperty.name];
    const resourceProperty = getProperty(resourceModel, patchProperty.name);

    if (resourceProperty === undefined) {
      invalidProperties.push(...collectPropertyPaths(patchProperty, currentPath, visited));
      continue;
    }

    if (
      patchProperty.type.kind === "Model" &&
      resourceProperty.type.kind === "Model"
    ) {
      invalidProperties.push(
        ...findInvalidPatchProperties(
          patchProperty.type,
          resourceProperty.type,
          currentPath,
          visited,
        ),
      );
    }
  }

  return invalidProperties;
}

function collectPropertyPaths(
  property: ModelProperty,
  path: string[],
  visited: Set<Model>,
): Array<{ path: string[]; property: ModelProperty }> {
  if (property.type.kind !== "Model") {
    return [{ path, property }];
  }

  if (visited.has(property.type)) {
    return [{ path, property }];
  }
  visited.add(property.type);

  const nestedProperties = getModelProperties(property.type);
  if (nestedProperties.length === 0) {
    return [{ path, property }];
  }

  return nestedProperties.flatMap((nestedProperty) =>
    collectPropertyPaths(nestedProperty, [...path, nestedProperty.name], visited)
  );
}

function getModelProperties(model: Model): ModelProperty[] {
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
