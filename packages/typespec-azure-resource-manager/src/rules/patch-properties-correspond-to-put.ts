import {
  createRule,
  fileRef,
  getDiscriminator,
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
import {
  getAddedOnVersions,
  getRemovedOnVersions,
  resolveVersions,
  type VersionResolution,
} from "@typespec/versioning";

export const patchPropertiesCorrespondToPutRule = createRule({
  name: "patch-properties-correspond-to-put",
  docs: fileRef.fromPackageRoot("src/rules/patch-properties-correspond-to-put.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/patch-properties-correspond-to-put",
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
        const missingProperties = new Map<DiagnosticTarget, Set<string>>();
        for (const service of services) {
          const missingPatchBodies = new Set<Operation>();
          const emptyPatchBodies = new Set<Operation>();
          const missingPutBodies = new Set<Operation>();

          for (const version of resolveVersions(program, service.namespace)) {
            const operationsByPath = new Map<
              string,
              { patch?: HttpOperation; put?: HttpOperation }
            >();
            for (const httpOperation of service.operations) {
              if (
                !isAvailableAtVersion(program, httpOperation.operation, version) ||
                (httpOperation.overloading !== undefined &&
                  isOverloadSameEndpoint(
                    httpOperation as HttpOperation & { overloading: HttpOperation },
                  ))
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
              const patchBody = getBodyAtVersion(program, patch, version);
              if (patchBody === undefined || isVoidType(patchBody)) {
                if (!missingPatchBodies.has(patch.operation)) {
                  missingPatchBodies.add(patch.operation);
                  context.reportDiagnostic({
                    target: patch.operation,
                    messageId: "missingPatchBody",
                  });
                }
                continue;
              }
              const putBody = getBodyAtVersion(program, put, version);
              if (putBody === undefined || isVoidType(putBody)) {
                if (!missingPutBodies.has(patch.operation)) {
                  missingPutBodies.add(patch.operation);
                  context.reportDiagnostic({
                    target: patch.operation,
                    messageId: "missingPutBody",
                  });
                }
                continue;
              }

              const putPropertyNames = new Set(
                collectLeafProperties(program, putBody, put.operation, "put", version).map(
                  (property) => property.jsonName,
                ),
              );
              const patchProperties = collectLeafProperties(
                program,
                patchBody,
                patch.operation,
                "patch",
                version,
              );
              if (patchProperties.length === 0) {
                if (!emptyPatchBodies.has(patch.operation)) {
                  emptyPatchBodies.add(patch.operation);
                  context.reportDiagnostic({
                    target: patch.operation,
                    messageId: "emptyPatchBody",
                  });
                }
                continue;
              }
              for (const patchProperty of patchProperties) {
                if (putPropertyNames.has(patchProperty.jsonName)) {
                  continue;
                }
                const reportedNames = missingProperties.get(patchProperty.target) ?? new Set();
                if (reportedNames.has(patchProperty.jsonName)) {
                  continue;
                }
                reportedNames.add(patchProperty.jsonName);
                missingProperties.set(patchProperty.target, reportedNames);
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

function getBodyAtVersion(
  program: Program,
  operation: HttpOperation,
  version: VersionResolution,
): Type | undefined {
  const body = operation.parameters.body;
  return body?.property !== undefined && !isAvailableAtVersion(program, body.property, version)
    ? undefined
    : body?.type;
}

function collectLeafProperties(
  program: Program,
  body: Type,
  operation: Operation,
  verb: "patch" | "put",
  version: VersionResolution,
): LeafProperty[] {
  const metadataInfo = createMetadataInfo(program, {
    canonicalVisibility: Visibility.Read,
    canShareProperty: (property) => canSharePropertyUsingReadonlyOrXmsMutability(program, property),
  });
  const visibility = resolveRequestVisibility(program, operation, verb);
  return collectTypeLeaves(program, body, operation, metadataInfo, visibility, version, new Set());
}

function collectTypeLeaves(
  program: Program,
  type: Type,
  diagnosticTarget: DiagnosticTarget,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
  version: VersionResolution,
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
          version,
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
      isAvailableAtVersion(program, property, version) &&
      metadataInfo.isPayloadProperty(property, schemaVisibility) &&
      !isNeverType(property.type),
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
      version,
    )
      ? collectTypeLeaves(
          program,
          property.type,
          target,
          metadataInfo,
          schemaVisibility,
          version,
          visiting,
        )
      : [];
    if (nested.length === 0) {
      leaves.push({ jsonName, target });
    } else {
      leaves.push(...nested);
    }
  }
  const leafNames = new Set(leaves.map((leaf) => leaf.jsonName));
  for (const discriminator of getSynthesizedDiscriminators(program, type)) {
    if (!leafNames.has(discriminator.jsonName)) {
      leaves.push({
        jsonName: discriminator.jsonName,
        target:
          getLocationContext(program, discriminator.target).type === "project"
            ? discriminator.target
            : diagnosticTarget,
      });
      leafNames.add(discriminator.jsonName);
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
  version: VersionResolution,
): boolean {
  if (type.kind === "Union") {
    const variants = [...type.variants.values()]
      .map((variant) => variant.type)
      .filter((variant) => !isNullType(variant));
    return (
      variants.length === 1 &&
      hasDirectPayloadProperties(program, variants[0], metadataInfo, visibility, version)
    );
  }
  if (type.kind !== "Model") {
    return false;
  }

  const schemaVisibility = metadataInfo.isTransformed(type, visibility)
    ? visibility
    : Visibility.Read;
  return (
    [...type.properties.values()].some(
      (property) =>
        isAvailableAtVersion(program, property, version) &&
        metadataInfo.isPayloadProperty(property, schemaVisibility) &&
        !isNeverType(property.type),
    ) || hasDirectSynthesizedDiscriminator(program, type)
  );
}

function isAvailableAtVersion(
  program: Program,
  type: Type,
  resolution: VersionResolution,
): boolean {
  const parent =
    type.kind === "ModelProperty"
      ? type.model
      : type.kind === "Operation"
        ? type.interface
        : undefined;
  if (parent !== undefined && !isAvailableAtVersion(program, parent, resolution)) {
    return false;
  }
  const changes = [
    ...(getAddedOnVersions(program, type) ?? []).map((version) => ({ version, available: true })),
    ...(getRemovedOnVersions(program, type) ?? []).map((version) => ({
      version,
      available: false,
    })),
  ].sort((a, b) => a.version.index - b.version.index);
  let available = changes.length === 0 || !changes[0].available;
  for (const change of changes) {
    const selected = resolution.versions.get(change.version.namespace);
    if (selected === undefined) {
      return true;
    }
    if (change.version.index <= selected.index) {
      available = change.available;
    }
  }
  return available;
}

function hasDirectSynthesizedDiscriminator(program: Program, model: Model): boolean {
  const discriminator = getDiscriminator(program, model);
  return (
    discriminator !== undefined && model.properties.get(discriminator.propertyName) === undefined
  );
}

function getSynthesizedDiscriminators(
  program: Program,
  model: Model,
): { jsonName: string; target: Model }[] {
  const discriminators = new Map<string, Model>();
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    const discriminator = getDiscriminator(program, current);
    if (
      discriminator !== undefined &&
      current.properties.get(discriminator.propertyName) === undefined &&
      !discriminators.has(discriminator.propertyName)
    ) {
      discriminators.set(discriminator.propertyName, current);
    }
  }
  return [...discriminators].map(([jsonName, target]) => ({ jsonName, target }));
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
