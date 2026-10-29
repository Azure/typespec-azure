import {
  getLocationContext,
  isNeverType,
  isVoidType,
  paramMessage,
  type DiagnosticMessages,
  type DiagnosticTarget,
  type LinterRuleContext,
  type Model,
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
import { getSingleNonNullMember, walkJsonProperties } from "./model-utils.js";

export const patchBodyMessages = {
  missingPatchBody: "The PATCH operation must have a request body.",
  emptyPatchBody: "The PATCH request body must contain at least one property.",
  missingProperty: paramMessage`The property '${"propertyName"}' in the PATCH body does not correspond to a property in the PUT body.`,
};

export function createPatchBodyListener(context: LinterRuleContext<DiagnosticMessages>) {
  const metadataInfo = createMetadataInfo(context.program);
  return {
    root: (program: Program) => {
      const [services] = getAllHttpServices(program);
      const missingProperties = new Map<DiagnosticTarget, Set<string>>();
      for (const service of services) {
        const missingPatchBodies = new Set<Operation>();
        const emptyPatchBodies = new Set<Operation>();

        for (const version of resolveVersions(program, service.namespace)) {
          const operationsByPath = new Map<
            string,
            { patch?: HttpOperation; put?: HttpOperation }
          >();
          for (const httpOperation of service.operations) {
            if (
              getLocationContext(program, httpOperation.operation).type !== "project" ||
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
            if (patch.parameters.body?.bodyKind !== "single" || !isObjectBody(patchBody)) {
              continue;
            }

            const patchProperties = collectLeafProperties(
              program,
              patchBody,
              patch,
              metadataInfo,
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
            const putBody = getBodyAtVersion(program, put, version);
            if (
              putBody === undefined ||
              put.parameters.body?.bodyKind !== "single" ||
              !isObjectBody(putBody)
            ) {
              continue;
            }
            const putPropertyNames = new Set(
              collectLeafProperties(program, putBody, put, metadataInfo, version).map(
                (property) => property.jsonName,
              ),
            );
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
}

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
  operation: HttpOperation,
  metadataInfo: MetadataInfo,
  version: VersionResolution,
): LeafProperty[] {
  const visibility = resolveRequestVisibility(program, operation.operation, operation.verb);
  const bodyParameter = operation.parameters.body;
  return collectTypeLeaves(
    program,
    body,
    operation.operation,
    metadataInfo,
    visibility,
    bodyParameter?.bodyKind === "single" ? bodyParameter.isExplicit : false,
    version,
    new Set(),
  );
}

function isObjectBody(type: Type): boolean {
  if (type.kind === "Union") {
    const member = getSingleNonNullMember(type);
    return member !== undefined && isObjectBody(member);
  }
  if (type.kind !== "Model") return false;
  for (let model: Model | undefined = type; model !== undefined; model = model.baseModel) {
    if (model.indexer !== undefined) return false;
  }
  return true;
}

function collectTypeLeaves(
  program: Program,
  type: Type,
  diagnosticTarget: DiagnosticTarget,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
  inExplicitBody: boolean | undefined,
  version: VersionResolution,
  visiting: Set<Model>,
): LeafProperty[] {
  if (type.kind === "Union") {
    const member = getSingleNonNullMember(type);
    return member !== undefined
      ? collectTypeLeaves(
          program,
          member,
          diagnosticTarget,
          metadataInfo,
          visibility,
          inExplicitBody,
          version,
          visiting,
        )
      : [];
  }
  if (type.kind !== "Model" || visiting.has(type)) {
    return [];
  }

  const properties = [...walkJsonProperties(program, type)].filter(
    ([, property]) =>
      isAvailableAtVersion(program, property, version) &&
      metadataInfo.isPayloadProperty(property, visibility, inExplicitBody) &&
      !isNeverType(property.type),
  );
  visiting.add(type);
  const leaves: LeafProperty[] = [];
  for (const [jsonName, property] of properties) {
    const target =
      getLocationContext(program, property).type === "project" ? property : diagnosticTarget;
    const nested = hasDirectPayloadProperties(
      program,
      property.type,
      metadataInfo,
      visibility,
      inExplicitBody,
      version,
    )
      ? collectTypeLeaves(
          program,
          property.type,
          target,
          metadataInfo,
          visibility,
          inExplicitBody,
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
  visiting.delete(type);
  return leaves;
}

function hasDirectPayloadProperties(
  program: Program,
  type: Type,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
  inExplicitBody: boolean | undefined,
  version: VersionResolution,
): boolean {
  if (type.kind === "Union") {
    const member = getSingleNonNullMember(type);
    return (
      member !== undefined &&
      hasDirectPayloadProperties(program, member, metadataInfo, visibility, inExplicitBody, version)
    );
  }
  if (type.kind !== "Model") {
    return false;
  }

  return [...type.properties.values()].some(
    (property) =>
      isAvailableAtVersion(program, property, version) &&
      metadataInfo.isPayloadProperty(property, visibility, inExplicitBody) &&
      !isNeverType(property.type),
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
