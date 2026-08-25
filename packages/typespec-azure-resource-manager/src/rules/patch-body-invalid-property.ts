import {
  createRule,
  fileRef,
  getDiscriminator,
  getLifecycleVisibilityEnum,
  getLocationContext,
  getVisibilityForClass,
  isNeverType,
  isNullType,
  paramMessage,
  resolveEncodedName,
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
import { resolveProviderNamespace } from "../namespace.js";

export const patchBodyInvalidPropertyRule = createRule({
  name: "patch-body-invalid-property",
  docs: fileRef.fromPackageRoot("src/rules/patch-body-invalid-property.md"),
  severity: "warning",
  description: "ARM PATCH body properties must not be required, have defaults, or be create-only.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/patch-body-invalid-property",
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
        if (patchBody === undefined) {
          return;
        }

        for (const violation of findViolations(context.program, patchBody, operation)) {
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

function findViolations(program: Program, patchBody: Type, operation: Operation): Violation[] {
  const violations: Violation[] = [];
  const metadataInfo = createMetadataInfo(program, {
    canonicalVisibility: Visibility.Read,
    canShareProperty: (property) => canSharePropertyUsingReadonlyOrXmsMutability(program, property),
  });
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
  const schemaVisibility = metadataInfo.isTransformed(model, visibility)
    ? visibility
    : Visibility.Read;
  const visitedVisibilities = visited.get(model);
  if (visitedVisibilities?.has(schemaVisibility)) {
    return;
  }
  if (visitedVisibilities === undefined) {
    visited.set(model, new Set([schemaVisibility]));
  } else {
    visitedVisibilities.add(schemaVisibility);
  }

  const discriminator = getInheritedDiscriminator(program, model);
  if (
    discriminator !== undefined &&
    getModelProperty(model, discriminator.propertyName) === undefined &&
    !isTopLevelIdentityProperty([...path, discriminator.propertyName], discriminator.propertyName)
  ) {
    violations.push({
      target: getLocationContext(program, model).type === "project" ? model : diagnosticTarget,
      propertyName: [...path, discriminator.propertyName].join("."),
      messageId: "required",
    });
  }

  for (const property of getModelProperties(model)) {
    const jsonName = resolveEncodedName(program, property, "application/json");
    const propertyPath = [...path, jsonName];
    if (isTopLevelIdentityProperty(propertyPath, jsonName)) {
      continue;
    }
    if (!metadataInfo.isPayloadProperty(property, schemaVisibility)) {
      continue;
    }
    if (isNeverType(property.type)) {
      continue;
    }
    const propertyTarget =
      getLocationContext(program, property).type === "project" ? property : diagnosticTarget;

    if (
      !metadataInfo.isOptional(property, schemaVisibility) ||
      property.name === discriminator?.propertyName
    ) {
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
      schemaVisibility,
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

function getInheritedDiscriminator(program: Program, model: Model) {
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    const discriminator = getDiscriminator(program, current);
    if (discriminator !== undefined) {
      return discriminator;
    }
  }

  return undefined;
}

function canSharePropertyUsingReadonlyOrXmsMutability(
  program: Program,
  property: ModelProperty,
): boolean {
  const lifecycle = getLifecycleVisibilityEnum(program);
  const visibility = getVisibilityForClass(program, property, lifecycle);
  if (visibility.size === lifecycle.members.size) {
    return true;
  }

  return (
    visibility.size > 0 &&
    [...visibility].every((member) => ["Read", "Create", "Update"].includes(member.name))
  );
}

function getModelProperty(model: Model, name: string): ModelProperty | undefined {
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    const property = current.properties.get(name);
    if (property !== undefined) {
      return property;
    }
  }

  return undefined;
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
