import {
  createRule,
  fileRef,
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

const unsupportedPatchProperties = new Set(["id", "name", "type", "location"]);

export const noUnsupportedPatchPropertiesRule = createRule({
  name: "no-unsupported-patch-properties",
  docs: fileRef.fromPackageRoot("src/rules/no-unsupported-patch-properties.md"),
  description:
    "ARM PATCH request bodies must not contain writable resource identity, location, or provisioning state properties.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-unsupported-patch-properties",
  messages: {
    default: paramMessage`PATCH request body property '${"propertyName"}' is not patchable and should be removed or made read-only or immutable.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "patch" || httpOperation.parameters.body === undefined) {
          return;
        }

        for (const violation of findViolations(
          context.program,
          httpOperation.parameters.body.type,
          operation,
        )) {
          context.reportDiagnostic({
            target: violation.target,
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
};

function findViolations(program: Program, patchBody: Type, operation: Operation): Violation[] {
  const patchModel = getModelType(patchBody);
  if (patchModel === undefined) {
    return [];
  }

  const metadataInfo = createMetadataInfo(program, {
    canonicalVisibility: Visibility.Read,
    canShareProperty: (property) => canSharePropertyUsingReadonlyOrXmsMutability(program, property),
  });
  const visibility = resolveRequestVisibility(program, operation, "patch");
  const schemaVisibility = getSchemaVisibility(metadataInfo, patchModel, visibility);
  const violations: Violation[] = [];

  for (const { property, jsonName } of getModelProperties(program, patchModel)) {
    if (!metadataInfo.isPayloadProperty(property, schemaVisibility) || isNeverType(property.type)) {
      continue;
    }

    if (unsupportedPatchProperties.has(jsonName) && isWritableProperty(program, property)) {
      violations.push({
        target: getDiagnosticTarget(program, property, operation),
        propertyName: jsonName,
      });
    }

    if (jsonName === "properties") {
      collectProvisioningStateViolation(
        program,
        property.type,
        operation,
        metadataInfo,
        schemaVisibility,
        violations,
      );
    }
  }

  return violations;
}

function collectProvisioningStateViolation(
  program: Program,
  type: Type,
  operation: Operation,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
  violations: Violation[],
) {
  const propertiesModel = getModelType(type);
  if (propertiesModel === undefined) {
    return;
  }

  const schemaVisibility = getSchemaVisibility(metadataInfo, propertiesModel, visibility);
  for (const { property, jsonName } of getModelProperties(program, propertiesModel)) {
    if (
      jsonName === "provisioningState" &&
      metadataInfo.isPayloadProperty(property, schemaVisibility) &&
      !isNeverType(property.type) &&
      isWritableProperty(program, property)
    ) {
      violations.push({
        target: getDiagnosticTarget(program, property, operation),
        propertyName: `properties.${jsonName}`,
      });
    }
  }
}

function getModelType(type: Type): Model | undefined {
  if (type.kind === "Model") {
    return type;
  }
  if (type.kind !== "Union") {
    return undefined;
  }

  const nonNullVariants = [...type.variants.values()]
    .map((variant) => variant.type)
    .filter((variant) => !isNullType(variant));
  return nonNullVariants.length === 1 && nonNullVariants[0].kind === "Model"
    ? nonNullVariants[0]
    : undefined;
}

function getSchemaVisibility(
  metadataInfo: MetadataInfo,
  model: Model,
  visibility: Visibility,
): Visibility {
  return metadataInfo.isTransformed(model, visibility) ? visibility : Visibility.Read;
}

function isWritableProperty(program: Program, property: ModelProperty): boolean {
  const lifecycle = getLifecycleVisibilityEnum(program);
  const visibility = getVisibilityForClass(program, property, lifecycle);
  const read = lifecycle.members.get("Read");
  const update = lifecycle.members.get("Update");
  if (read !== undefined && visibility.size === 1 && visibility.has(read)) {
    return false;
  }

  const emittedMutability = [...visibility].filter((member) =>
    ["Read", "Create", "Update"].includes(member.name),
  );
  return (
    visibility.size === lifecycle.members.size ||
    emittedMutability.length === 0 ||
    (update !== undefined && visibility.has(update))
  );
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

function getDiagnosticTarget(
  program: Program,
  property: ModelProperty,
  operation: Operation,
): DiagnosticTarget {
  return getLocationContext(program, property).type === "project" ? property : operation;
}

function getModelProperties(
  program: Program,
  model: Model,
): { property: ModelProperty; jsonName: string }[] {
  const properties = new Map<string, ModelProperty>();

  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    for (const property of current.properties.values()) {
      const jsonName = resolveEncodedName(program, property, "application/json");
      if (!properties.has(jsonName)) {
        properties.set(jsonName, property);
      }
    }
  }

  return [...properties].map(([jsonName, property]) => ({ property, jsonName }));
}
