import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getDiscriminator,
  getProperty,
  isNeverType,
  isNullType,
  paramMessage,
  resolveEncodedName,
  type Model,
  type ModelProperty,
  type Program,
  type Type,
} from "@typespec/compiler";
import { getAllHttpServices, type HttpOperation, type HttpOperationResponse } from "@typespec/http";

export const consistentPatchPropertiesRule = createRule({
  name: "consistent-patch-properties",
  description:
    "ARM PATCH body properties must exist in the resource model at the same nesting level.",
  severity: "warning",
  messages: {
    default: paramMessage`The property '${"propertyName"}' in the request body either does not appear in the resource model or is nested at the wrong level.`,
  },
  create(context) {
    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          if (resolveProviderNamespace(context.program, service.namespace) === undefined) {
            continue;
          }

          for (const httpOperation of service.operations) {
            if (httpOperation.verb !== "patch") {
              continue;
            }

            const patchBody = getObjectModel(httpOperation.parameters.body?.type);
            const resourceType = getResourceType(httpOperation, service.operations);
            if (patchBody === undefined) {
              continue;
            }
            if (resourceType === undefined) {
              continue;
            }

            const resourceModel = getObjectModel(resourceType);
            const invalidProperties =
              resourceModel === undefined
                ? [...getPayloadProperties(context.program, patchBody)].map(
                    ([jsonName, property]) => ({ path: [jsonName], target: property.target }),
                  )
                : findInvalidPatchProperties(context.program, patchBody, resourceModel);

            for (const invalidProperty of invalidProperties) {
              context.reportDiagnostic({
                target: invalidProperty.target,
                format: {
                  propertyName: invalidProperty.path.join("."),
                },
              });
            }
          }
        }
      },
    };
  },
});

function getResourceType(
  patchOperation: HttpOperation,
  operations: HttpOperation[],
): Type | undefined {
  const getOperation = operations.find(
    (operation) => operation.verb === "get" && operation.path === patchOperation.path,
  );

  return (
    getResponseBodyType(patchOperation.responses, 200) ??
    getResponseBodyType(patchOperation.responses, 201) ??
    getResponseBodyType(getOperation?.responses, 200) ??
    getResponseBodyType(getOperation?.responses, 201)
  );
}

function getResponseBodyType(
  responses: HttpOperationResponse[] | undefined,
  statusCode: number,
): Type | undefined {
  const response =
    responses?.find((response) => response.statusCodes === statusCode) ??
    responses?.find(
      (response) =>
        typeof response.statusCodes === "object" &&
        statusCode >= response.statusCodes.start &&
        statusCode <= response.statusCodes.end,
    );
  const body = response?.responses.find((content) => content.body !== undefined)?.body;
  return body?.type;
}

function findInvalidPatchProperties(
  program: Program,
  patchModel: Model,
  resourceModel: Model,
  path: string[] = [],
  activePairs: Map<Model, Set<Model>> = new Map(),
): Array<{ path: string[]; target: Model | ModelProperty }> {
  const activeResources = activePairs.get(patchModel);
  if (activeResources?.has(resourceModel)) {
    return [];
  }
  if (activeResources === undefined) {
    activePairs.set(patchModel, new Set([resourceModel]));
  } else {
    activeResources.add(resourceModel);
  }

  const invalidProperties: Array<{ path: string[]; target: Model | ModelProperty }> = [];
  const resourceProperties = getPayloadProperties(program, resourceModel);

  for (const [jsonName, patchProperty] of getPayloadProperties(program, patchModel)) {
    const currentPath = [...path, jsonName];
    const resourceProperty = resourceProperties.get(jsonName);

    if (resourceProperty === undefined) {
      invalidProperties.push(
        ...collectPropertyPaths(program, patchProperty, currentPath, new Set()),
      );
      continue;
    }

    const patchPropertyModel = getObjectModel(patchProperty.type);
    if (patchPropertyModel !== undefined) {
      const resourcePropertyModel = getObjectModel(resourceProperty.type);
      if (resourcePropertyModel !== undefined) {
        invalidProperties.push(
          ...findInvalidPatchProperties(
            program,
            patchPropertyModel,
            resourcePropertyModel,
            currentPath,
            activePairs,
          ),
        );
      } else {
        invalidProperties.push(
          ...collectNestedPropertyPaths(program, patchPropertyModel, currentPath),
        );
      }
    }
  }

  activePairs.get(patchModel)?.delete(resourceModel);
  return invalidProperties;
}

function collectNestedPropertyPaths(
  program: Program,
  model: Model,
  path: string[],
): Array<{ path: string[]; target: Model | ModelProperty }> {
  const visited = new Set([model]);
  return [...getPayloadProperties(program, model)].flatMap(([jsonName, property]) =>
    collectPropertyPaths(program, property, [...path, jsonName], visited),
  );
}

function collectPropertyPaths(
  program: Program,
  property: PayloadProperty,
  path: string[],
  visited: Set<Model>,
): Array<{ path: string[]; target: Model | ModelProperty }> {
  const propertyModel = getObjectModel(property.type);
  if (propertyModel === undefined) {
    return [{ path, target: property.target }];
  }

  if (visited.has(propertyModel)) {
    return [{ path, target: property.target }];
  }
  visited.add(propertyModel);

  const nestedProperties = getPayloadProperties(program, propertyModel);
  if (nestedProperties.size === 0) {
    return [{ path, target: property.target }];
  }

  const invalidProperties = [...nestedProperties].flatMap(([jsonName, nestedProperty]) =>
    collectPropertyPaths(program, nestedProperty, [...path, jsonName], visited),
  );
  visited.delete(propertyModel);
  return invalidProperties;
}

interface PayloadProperty {
  target: Model | ModelProperty;
  type?: Type;
}

function getPayloadProperties(program: Program, model: Model): Map<string, PayloadProperty> {
  const properties = new Map<string, PayloadProperty>();

  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    for (const property of current.properties.values()) {
      // A derived declaration shadows its base even when its payload type is never.
      if (getProperty(model, property.name) !== property) {
        continue;
      }
      const jsonName = resolveEncodedName(program, property, "application/json");
      if (!properties.has(jsonName) && !isNeverType(property.type)) {
        properties.set(jsonName, { target: property, type: property.type });
      }
    }
  }

  // Resolve the complete authored shape before filling in discriminator metadata.
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    const discriminator = getDiscriminator(program, current);
    if (
      discriminator !== undefined &&
      getProperty(model, discriminator.propertyName) === undefined &&
      !properties.has(discriminator.propertyName)
    ) {
      properties.set(discriminator.propertyName, { target: current });
    }
  }

  return properties;
}

function getObjectModel(type: Type | undefined): Model | undefined {
  if (type?.kind === "Model") {
    return type;
  }
  if (type?.kind !== "Union") {
    return undefined;
  }

  const nonNullVariants = [...type.variants.values()]
    .map((variant) => variant.type)
    .filter((variant) => !isNullType(variant));
  return nonNullVariants.length === 1 && nonNullVariants[0].kind === "Model"
    ? nonNullVariants[0]
    : undefined;
}
