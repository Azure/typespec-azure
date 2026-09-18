import {
  createRule,
  fileRef,
  getDiscriminator,
  getLifecycleVisibilityEnum,
  getLocationContext,
  getProperty,
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
} from "@typespec/http";

export const noUnsafePatchBodyPropertiesRule = createRule({
  name: "no-unsafe-patch-body-properties",
  docs: fileRef.fromPackageRoot("src/rules/no-unsafe-patch-body-properties.md"),
  severity: "warning",
  description: "ARM PATCH body properties must not be required, have defaults, or be create-only.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-unsafe-patch-body-properties",
  messages: {
    required: paramMessage`Properties of a PATCH request body must not be required, property:${"propertyName"}.`,
    default: paramMessage`Properties of a PATCH request body must not have default value, property:${"propertyName"}.`,
    createOnly: paramMessage`Properties of a PATCH request body must not be visible only during Lifecycle.Create, property:${"propertyName"}.`,
  },
  create(context) {
    const { program } = context;
    const metadataInfo = createMetadataInfo(program, {
      canonicalVisibility: Visibility.Read,
      canShareProperty: (property) =>
        canSharePropertyUsingReadonlyOrXmsMutability(program, property),
    });

    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(program, operation);
        if (httpOperation.verb !== "patch") {
          return;
        }

        const patchBody = httpOperation.parameters.body;
        if (patchBody?.bodyKind !== "single") {
          return;
        }

        for (const violation of findViolations(patchBody.type, operation)) {
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

    function findViolations(patchBody: Type, operation: Operation): Violation[] {
      const violations: Violation[] = [];
      const visited = new Map<Model, Set<Visibility>>();
      const visibility = resolveRequestVisibility(program, operation, "patch");
      collectNestedViolations(patchBody, [], operation, visibility);
      return violations;

      function collectViolations(
        model: Model,
        path: string[],
        diagnosticTarget: DiagnosticTarget,
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
          getProperty(model, discriminator.propertyName) === undefined &&
          !isTopLevelIdentityProperty(
            [...path, discriminator.propertyName],
            discriminator.propertyName,
          )
        ) {
          violations.push({
            target:
              getLocationContext(program, model).type === "project" ? model : diagnosticTarget,
            propertyName: [...path, discriminator.propertyName].join("."),
            messageId: "required",
          });
        }

        for (const property of walkPropertiesInherited(model)) {
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

          collectNestedViolations(property.type, propertyPath, propertyTarget, schemaVisibility);
        }
      }

      function collectNestedViolations(
        type: Type,
        path: string[],
        diagnosticTarget: DiagnosticTarget,
        visibility: Visibility,
      ) {
        if (type.kind === "Model") {
          collectViolations(type, path, diagnosticTarget, visibility);
          return;
        }

        if (type.kind === "Union") {
          const nonNullVariants = [...type.variants.values()]
            .map((variant) => variant.type)
            .filter((variant) => !isNullType(variant));
          if (nonNullVariants.length === 1) {
            collectNestedViolations(nonNullVariants[0], path, diagnosticTarget, visibility);
          }
        }
      }
    }
  },
});

type Violation = {
  target: DiagnosticTarget;
  propertyName: string;
  messageId: "required" | "default" | "createOnly";
};

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
