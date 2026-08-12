import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getLifecycleVisibilityEnum,
  getVisibilityForClass,
  paramMessage,
  type Model,
  type ModelProperty,
  type Program,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const patchBodyParametersSchemaRule = createRule({
  name: "patch-body-parameters-schema",
  description: "ARM PATCH body properties must not be required and must not have defaults.",
  severity: "warning",
  messages: {
    required: paramMessage`Properties of a PATCH request body must not be required, property:${"propertyName"}.`,
    default: paramMessage`Properties of a PATCH request body must not have default value, property:${"propertyName"}.`,
    createOnly: paramMessage`Properties of a PATCH request body must not be x-ms-mutability: ["create"], property:${"propertyName"}.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
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

        for (const violation of findViolations(context.program, patchBody)) {
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
  messageId: "required" | "default" | "createOnly";
};

function findViolations(program: Program, patchModel: Model): Violation[] {
  const violations: Violation[] = [];
  collectViolations(program, patchModel, violations, [], new Set());
  return violations;
}

function collectViolations(
  program: Program,
  model: Model,
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
    if (isTopLevelIdentityProperty(propertyPath)) {
      continue;
    }

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

    if (isCreateOnlyMutability(program, property)) {
      violations.push({
        target: property,
        propertyName: propertyPath.join("."),
        messageId: "createOnly",
      });
    }

    if (property.type.kind === "Model") {
      collectViolations(program, property.type, violations, propertyPath, visited);
    }
  }
}

function isTopLevelIdentityProperty(propertyPath: string[]): boolean {
  return propertyPath.length === 1 && propertyPath[0].toLowerCase() === "identity";
}

function isCreateOnlyMutability(program: Program, property: ModelProperty): boolean {
  const lifecycle = getLifecycleVisibilityEnum(program);
  const create = lifecycle.members.get("Create");
  if (create === undefined) {
    return false;
  }

  const visibility = getVisibilityForClass(program, property, lifecycle);
  return visibility.size === 1 && visibility.has(create);
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
