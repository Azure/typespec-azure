import {
  createRule,
  paramMessage,
  type Model,
  type ModelProperty,
  type Operation,
} from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

export const patchBodyParametersSchemaRule = createRule({
  name: "patch-body-parameters-schema",
  description:
    "ARM PATCH body properties must not be required and must not have defaults.",
  severity: "warning",
  messages: {
    required: paramMessage`Properties of a PATCH request body must not be required, property:${"propertyName"}.`,
    default: paramMessage`Properties of a PATCH request body must not have default value, property:${"propertyName"}.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (
          resolveProviderNamespace(context.program, namespace) === undefined
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "patch") {
          return;
        }

        const patchBody = httpOperation.parameters.body?.type;
        if (patchBody?.kind !== "Model") {
          return;
        }

        for (const violation of findViolations(operation, patchBody)) {
          context.reportDiagnostic({
            target: violation.target,
            messageId: violation.messageId,
            format: {
              propertyName: violation.propertyName,
            },
          });
        }
      },
    };
  },
});

type Violation = {
  target: ModelProperty;
  propertyName: string;
  messageId: "required" | "default";
};

function findViolations(operation: Operation, patchModel: Model): Violation[] {
  const violations: Violation[] = [];
  collectViolations(patchModel, operation.name, violations, [], new Set());
  return violations;
}

function collectViolations(
  model: Model,
  resourceName: string,
  violations: Violation[],
  path: string[] = [],
  visited: Set<Model> = new Set(),
) {
  if (visited.has(model)) {
    return;
  }
  visited.add(model);

  for (const property of getModelProperties(model)) {
    const propertyPath = [...path, property.name];
    if (
      !isTopLevelManagedIdentityException(resourceName, propertyPath, property)
    ) {
      if (!property.optional) {
        violations.push({
          target: property,
          propertyName: propertyPath.join("."),
          messageId: "required",
        });
      }

      if (property.defaultValue !== undefined) {
        violations.push({
          target: property,
          propertyName: propertyPath.join("."),
          messageId: "default",
        });
      }
    }

    if (property.type.kind === "Model") {
      collectViolations(
        property.type,
        resourceName,
        violations,
        propertyPath,
        visited,
      );
    }
  }
}

function isTopLevelManagedIdentityException(
  resourceName: string,
  propertyPath: string[],
  property: ModelProperty,
): boolean {
  if (propertyPath.length !== 1 || property.name !== "identity") {
    return false;
  }

  if (property.type.kind !== "Model") {
    return false;
  }

  return (
    property.type.name.includes("ManagedServiceIdentity") ||
    property.type.name.includes("SystemAssignedServiceIdentity")
  );
}

function getModelProperties(model: Model): ModelProperty[] {
  const properties = new Map<string, ModelProperty>();

  for (
    let current: Model | undefined = model;
    current !== undefined;
    current = current.baseModel
  ) {
    for (const property of current.properties.values()) {
      if (!properties.has(property.name)) {
        properties.set(property.name, property);
      }
    }
  }

  return [...properties.values()];
}
