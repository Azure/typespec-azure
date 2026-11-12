import {
  getLocationContext,
  isNeverType,
  isVoidType,
  paramMessage,
  type DiagnosticMessages,
  type DiagnosticTarget,
  type LinterRuleContext,
  type Model,
  type ModelProperty,
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
import { createPatchPropertyCompatibility } from "./arm-resource-patch-compatibility.js";
import { getSingleNonNullMember, walkJsonProperties } from "./model-utils.js";

export const patchBodyMessages = {
  missingPatchBody: "The PATCH operation must have a request body.",
  emptyPatchBody: "The PATCH request body must contain at least one property.",
  missingProperty: paramMessage`The property '${"propertyName"}' in the PATCH body does not correspond to a property in the PUT body.`,
  incompatibleProperty: paramMessage`The property '${"propertyName"}' in the PATCH body must preserve the format and bounds of its corresponding PUT property.`,
};

export function createPatchBodyListener(context: LinterRuleContext<DiagnosticMessages>) {
  const metadataInfo = createMetadataInfo(context.program);
  return {
    root: (program: Program) => {
      const [services] = getAllHttpServices(program);
      const missingProperties = new Map<DiagnosticTarget, Set<string>>();
      for (const service of services) {
        const operationsByPath = new Map<string, { patch?: HttpOperation; put?: HttpOperation }>();
        for (const httpOperation of service.operations) {
          if (
            getLocationContext(program, getOperationTarget(program, httpOperation)).type !==
              "project" ||
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
          const patchBody = patch.parameters.body?.type;
          if (patchBody === undefined || isVoidType(patchBody)) {
            context.reportDiagnostic({
              target: getOperationTarget(program, patch),
              messageId: "missingPatchBody",
            });
            continue;
          }
          if (patch.parameters.body?.bodyKind !== "single" || !isObjectBody(patchBody)) {
            continue;
          }

          const patchProperties = collectLeafProperties(program, patchBody, patch, metadataInfo);
          if (patchProperties.length === 0) {
            context.reportDiagnostic({
              target: getOperationTarget(program, patch),
              messageId: "emptyPatchBody",
            });
            continue;
          }
          const putBody = put.parameters.body?.type;
          const putProperties = new Map<string, LeafProperty[]>();
          if (putBody !== undefined && !isVoidType(putBody)) {
            if (put.parameters.body?.bodyKind !== "single" || !isObjectBody(putBody)) {
              continue;
            }
            for (const property of collectLeafProperties(program, putBody, put, metadataInfo)) {
              const candidates = putProperties.get(property.jsonName) ?? [];
              candidates.push(property);
              putProperties.set(property.jsonName, candidates);
            }
          }
          const compatible = createPatchPropertyCompatibility(program);
          for (const patchProperty of patchProperties) {
            const candidates =
              !patchProperty.recursive &&
              isObjectBody(patchProperty.property.type) &&
              putBody !== undefined
                ? findPropertiesAtPath(
                    program,
                    putBody,
                    patchProperty.jsonPath,
                    put,
                    metadataInfo,
                  ).map((property) => ({ property, recursive: false }))
                : (putProperties.get(patchProperty.jsonName) ?? []);
            if (
              candidates.some(
                (candidate) =>
                  (patchProperty.recursive && candidate.recursive) ||
                  compatible(patchProperty.property, candidate.property),
              )
            ) {
              continue;
            }
            const messageId = candidates.length > 0 ? "incompatibleProperty" : "missingProperty";
            const reportKey = `${messageId}:${patchProperty.jsonName}`;
            const reportedNames = missingProperties.get(patchProperty.target) ?? new Set();
            if (reportedNames.has(reportKey)) {
              continue;
            }
            reportedNames.add(reportKey);
            missingProperties.set(patchProperty.target, reportedNames);
            context.reportDiagnostic({
              target: patchProperty.target,
              messageId,
              format: { propertyName: patchProperty.jsonName },
            });
          }
        }
      }
    },
  };
}

type LeafProperty = {
  jsonName: string;
  jsonPath: string[];
  target: DiagnosticTarget;
  property: ModelProperty;
  recursive: boolean;
};

function getOperationTarget(program: Program, operation: HttpOperation): DiagnosticTarget {
  const target = operation.operation;
  return getLocationContext(program, target).type === "project"
    ? target
    : (target.interface ?? target);
}

function collectLeafProperties(
  program: Program,
  body: Type,
  operation: HttpOperation,
  metadataInfo: MetadataInfo,
): LeafProperty[] {
  const visibility = resolveRequestVisibility(program, operation.operation, operation.verb);
  const bodyParameter = operation.parameters.body;
  return collectTypeLeaves(
    program,
    body,
    getOperationTarget(program, operation),
    metadataInfo,
    visibility,
    bodyParameter?.bodyKind === "single" ? bodyParameter.isExplicit : false,
    new Set(),
    [],
  );
}

function findPropertiesAtPath(
  program: Program,
  body: Type,
  jsonPath: string[],
  operation: HttpOperation,
  metadataInfo: MetadataInfo,
): ModelProperty[] {
  const visibility = resolveRequestVisibility(program, operation.operation, operation.verb);
  const bodyParameter = operation.parameters.body;
  const inExplicitBody = bodyParameter?.bodyKind === "single" ? bodyParameter.isExplicit : false;
  let types = [body];
  let properties: ModelProperty[] = [];
  for (const jsonName of jsonPath) {
    properties = types.flatMap((type) => {
      while (type.kind === "Union") {
        const member = getSingleNonNullMember(type);
        if (member === undefined) return [];
        type = member;
      }
      if (type.kind !== "Model") return [];
      return [...walkJsonProperties(program, type)]
        .filter(
          ([name, property]) =>
            name === jsonName &&
            metadataInfo.isPayloadProperty(property, visibility, inExplicitBody) &&
            !isNeverType(property.type),
        )
        .map(([, property]) => property);
    });
    types = properties.map((property) => property.type);
  }
  return properties;
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
  visiting: Set<Model>,
  parentPath: string[],
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
          visiting,
          parentPath,
        )
      : [];
  }
  if (type.kind !== "Model" || visiting.has(type)) {
    return [];
  }

  const properties = [...walkJsonProperties(program, type)].filter(
    ([, property]) =>
      metadataInfo.isPayloadProperty(property, visibility, inExplicitBody) &&
      !isNeverType(property.type),
  );
  visiting.add(type);
  const leaves: LeafProperty[] = [];
  for (const [jsonName, property] of properties) {
    const target =
      getLocationContext(program, property).type === "project" ? property : diagnosticTarget;
    const recurse = hasPayloadProperties(
      program,
      property.type,
      metadataInfo,
      visibility,
      inExplicitBody,
    );
    const jsonPath = [...parentPath, jsonName];
    const candidate = { jsonName, jsonPath, target, property, recursive: recurse };
    const nested = recurse
      ? collectTypeLeaves(
          program,
          property.type,
          target,
          metadataInfo,
          visibility,
          inExplicitBody,
          visiting,
          jsonPath,
        )
      : [];
    if (nested.length === 0) {
      leaves.push(candidate);
    } else {
      leaves.push(...nested);
    }
  }
  visiting.delete(type);
  return leaves;
}

function hasPayloadProperties(
  program: Program,
  type: Type,
  metadataInfo: MetadataInfo,
  visibility: Visibility,
  inExplicitBody: boolean | undefined,
): boolean {
  if (type.kind === "Union") {
    const member = getSingleNonNullMember(type);
    return (
      member !== undefined &&
      hasPayloadProperties(program, member, metadataInfo, visibility, inExplicitBody)
    );
  }
  if (type.kind !== "Model") {
    return false;
  }

  return [...walkJsonProperties(program, type)].some(
    ([, property]) =>
      metadataInfo.isPayloadProperty(property, visibility, inExplicitBody) &&
      !isNeverType(property.type),
  );
}
