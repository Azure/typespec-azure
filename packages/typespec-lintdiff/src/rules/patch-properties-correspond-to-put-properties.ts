import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getLifecycleVisibilityEnum,
  getLocationContext,
  getVisibilityForClass,
  isNeverType,
  isNullType,
  isVoidType,
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
  getAllHttpServices,
  isOverloadSameEndpoint,
  resolveRequestVisibility,
  Visibility,
  type HttpOperation,
  type MetadataInfo,
} from "@typespec/http";

export const patchPropertiesCorrespondToPutPropertiesRule = createRule({
  name: "patch-properties-correspond-to-put-properties",
  description: "ARM PATCH body properties must correspond to properties in the PUT request body.",
  severity: "warning",
  messages: {
    missingPatchBody: "The PATCH operation must have a request body.",
    emptyPatchBody: "The PATCH request body must contain at least one property.",
    missingPutBody: "A PATCH request body requires the corresponding PUT operation to have a body.",
    missingProperty: paramMessage`The property '${"propertyName"}' in the PATCH body does not correspond to a property in the PUT body.`,
  },
  create(context) {
    return {
      root: (program) => {
        const [services] = getAllHttpServices(program);
        for (const service of services) {
          if (getArmProviderNamespace(program, service.namespace) === undefined) {
            continue;
          }

          const operationsByPath = new Map<
            string,
            { patch?: HttpOperation; put?: HttpOperation }
          >();
          for (const httpOperation of service.operations) {
            if (
              httpOperation.overloading !== undefined &&
              isOverloadSameEndpoint(
                httpOperation as HttpOperation & { overloading: HttpOperation },
              )
            ) {
              continue;
            }
            if (httpOperation.verb !== "patch" && httpOperation.verb !== "put") {
              continue;
            }
            const pair = operationsByPath.get(httpOperation.path) ?? {};
            pair[httpOperation.verb] = httpOperation;
            operationsByPath.set(httpOperation.path, pair);
          }

          for (const { patch, put } of operationsByPath.values()) {
            if (patch === undefined || put === undefined) {
              continue;
            }
            const patchBody = patch.parameters.body?.type;
            if (patchBody === undefined || isVoidType(patchBody)) {
              context.reportDiagnostic({
                target: patch.operation,
                messageId: "missingPatchBody",
              });
              continue;
            }
            const putBody = put.parameters.body?.type;
            if (putBody === undefined || isVoidType(putBody)) {
              context.reportDiagnostic({
                target: patch.operation,
                messageId: "missingPutBody",
              });
              continue;
            }

            const putPropertyNames = new Set(
              collectLeafProperties(program, putBody, put.operation, "put").map(
                (property) => property.jsonName,
              ),
            );
            const patchProperties = collectLeafProperties(
              program,
              patchBody,
              patch.operation,
              "patch",
            );
            if (patchProperties.length === 0) {
              context.reportDiagnostic({
                target: patch.operation,
                messageId: "emptyPatchBody",
              });
              continue;
            }
            for (const patchProperty of patchProperties) {
              if (!putPropertyNames.has(patchProperty.jsonName)) {
                context.reportDiagnostic({
                  target: patchProperty.target,
                  messageId: "missingProperty",
                  format: { propertyName: patchProperty.jsonName },
                });
              }
            }
          }
        }
      },
    };
  },
});

type LeafProperty = {
  jsonName: string;
  target: DiagnosticTarget;
};

function collectLeafProperties(
  program: Program,
  body: Type,
  operation: Operation,
  verb: "patch" | "put",
): LeafProperty[] {
  const metadataInfo = createMetadataInfo(program, {
    canonicalVisibility: Visibility.Read,
    canShareProperty: (property) => canSharePropertyUsingReadonlyOrXmsMutability(program, property),
  });
  const visibility = resolveRequestVisibility(program, operation, verb);
  return collectTypeLeaves(program, body, operation, metadataInfo, visibility, new Set());
}

function collectTypeLeaves(
  program: Program,
  type: Type,
  diagnosticTarget: DiagnosticTarget,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
  visiting: Set<Model>,
): LeafProperty[] {
  if (type.kind === "Union") {
    const variants = [...type.variants.values()]
      .map((variant) => variant.type)
      .filter((variant) => !isNullType(variant));
    return variants.length === 1
      ? collectTypeLeaves(
          program,
          variants[0],
          diagnosticTarget,
          metadataInfo,
          visibility,
          visiting,
        )
      : [];
  }
  if (type.kind !== "Model" || visiting.has(type)) {
    return [];
  }

  const schemaVisibility = metadataInfo.isTransformed(type, visibility)
    ? visibility
    : Visibility.Read;
  const properties = getModelProperties(type).filter(
    (property) =>
      metadataInfo.isPayloadProperty(property, schemaVisibility) && !isNeverType(property.type),
  );
  visiting.add(type);
  const leaves: LeafProperty[] = [];
  for (const property of properties) {
    const jsonName = resolveEncodedName(program, property, "application/json");
    const target =
      getLocationContext(program, property).type === "project" ? property : diagnosticTarget;
    const nested = hasDirectPayloadProperties(
      program,
      property.type,
      metadataInfo,
      schemaVisibility,
    )
      ? collectTypeLeaves(program, property.type, target, metadataInfo, schemaVisibility, visiting)
      : [];
    if (nested.length === 0) {
      leaves.push({ jsonName, target });
    } else {
      leaves.push(...nested);
    }
  }
  visiting.delete(type);
  return leaves;
}

function hasDirectPayloadProperties(
  program: Program,
  type: Type,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
): boolean {
  if (type.kind === "Union") {
    const variants = [...type.variants.values()]
      .map((variant) => variant.type)
      .filter((variant) => !isNullType(variant));
    return (
      variants.length === 1 &&
      hasDirectPayloadProperties(program, variants[0], metadataInfo, visibility)
    );
  }
  if (type.kind !== "Model") {
    return false;
  }

  const schemaVisibility = metadataInfo.isTransformed(type, visibility)
    ? visibility
    : Visibility.Read;
  return [...type.properties.values()].some(
    (property) =>
      metadataInfo.isPayloadProperty(property, schemaVisibility) && !isNeverType(property.type),
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
