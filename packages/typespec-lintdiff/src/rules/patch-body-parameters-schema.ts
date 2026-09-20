import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getLifecycleVisibilityEnum,
  getLocationContext,
  getVisibilityForClass,
  isNeverType,
  isNullType,
  paramMessage,
  resolveEncodedName,
  walkPropertiesInherited,
  type DiagnosticTarget,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Type,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpOperation,
  resolveRequestVisibility,
  Visibility,
  type MetadataInfo,
} from "@typespec/http";

export const patchBodyParametersSchemaRule = createRule({
  name: "patch-body-parameters-schema",
  description: "ARM PATCH body properties must not be required, have defaults, or be create-only.",
  severity: "warning",
  messages: {
    required: paramMessage`Properties of a PATCH request body must not be required, property:${"propertyName"}.`,
    default: paramMessage`Properties of a PATCH request body must not have default value, property:${"propertyName"}.`,
    createOnly: paramMessage`Properties of a PATCH request body must not be visible only during Lifecycle.Create, property:${"propertyName"}.`,
  },
  create(context) {
    const metadataInfo = createMetadataInfo(context.program);
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

        const patchBody = httpOperation.parameters.body;
        if (patchBody?.bodyKind !== "single") {
          return;
        }

        for (const violation of findViolations(
          context.program,
          patchBody.type,
          operation,
          metadataInfo,
        )) {
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
  target: DiagnosticTarget;
  propertyName: string;
  messageId: "required" | "default" | "createOnly";
};

function findViolations(
  program: Program,
  patchBody: Type,
  operation: Operation,
  metadataInfo: MetadataInfo,
): Violation[] {
  const violations: Violation[] = [];
  const visibility = resolveRequestVisibility(program, operation, "patch");
  collectNestedViolations(
    program,
    patchBody,
    violations,
    [],
    new Map(),
    operation,
    metadataInfo,
    visibility,
  );
  return violations;
}

function collectViolations(
  program: Program,
  model: Model,
  violations: Violation[],
  path: string[] = [],
  visited: Map<Model, Set<Visibility>> = new Map(),
  diagnosticTarget: DiagnosticTarget,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
) {
  const visitedVisibilities = visited.get(model);
  if (visitedVisibilities?.has(visibility)) {
    return;
  }
  if (visitedVisibilities === undefined) {
    visited.set(model, new Set([visibility]));
  } else {
    visitedVisibilities.add(visibility);
  }

  for (const property of walkPropertiesInherited(model)) {
    const jsonName = resolveEncodedName(program, property, "application/json");
    const propertyPath = [...path, jsonName];
    if (isTopLevelIdentityProperty(propertyPath, jsonName)) {
      continue;
    }
    if (!metadataInfo.isPayloadProperty(property, visibility)) {
      continue;
    }
    if (isNeverType(property.type)) {
      continue;
    }
    const propertyTarget =
      getLocationContext(program, property).type === "project" ? property : diagnosticTarget;

    if (!metadataInfo.isOptional(property, visibility)) {
      violations.push({
        target: propertyTarget,
        propertyName: propertyPath.join("."),
        messageId: "required",
      });
    }

    if (property.defaultValue !== undefined) {
      violations.push({
        target: propertyTarget,
        propertyName: propertyPath.join("."),
        messageId: "default",
      });
    }

    if (isCreateOnlyMutability(program, property)) {
      violations.push({
        target: propertyTarget,
        propertyName: propertyPath.join("."),
        messageId: "createOnly",
      });
    }

    collectNestedViolations(
      program,
      property.type,
      violations,
      propertyPath,
      visited,
      propertyTarget,
      metadataInfo,
      visibility,
    );
  }
}

function collectNestedViolations(
  program: Program,
  type: Type,
  violations: Violation[],
  path: string[],
  visited: Map<Model, Set<Visibility>>,
  diagnosticTarget: DiagnosticTarget,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
) {
  if (type.kind === "Model") {
    collectViolations(
      program,
      type,
      violations,
      path,
      visited,
      diagnosticTarget,
      metadataInfo,
      visibility,
    );
    return;
  }

  if (type.kind === "Union") {
    const nonNullVariants = [...type.variants.values()]
      .map((variant) => variant.type)
      .filter((variant) => !isNullType(variant));
    if (nonNullVariants.length === 1) {
      collectNestedViolations(
        program,
        nonNullVariants[0],
        violations,
        path,
        visited,
        diagnosticTarget,
        metadataInfo,
        visibility,
      );
    }
  }
}

function isTopLevelIdentityProperty(propertyPath: string[], jsonName: string): boolean {
  return propertyPath.length === 1 && jsonName.toLowerCase() === "identity";
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
