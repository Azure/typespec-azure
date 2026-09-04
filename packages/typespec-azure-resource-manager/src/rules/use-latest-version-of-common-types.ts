import {
  createRule,
  fileRef,
  getLifecycleVisibilityEnum,
  getService,
  getVisibilityForClass,
  isArrayModelType,
  listServices,
  paramMessage,
  walkPropertiesInherited,
  type Enum,
  type EnumMember,
  type Model,
  type ModelProperty,
  type Namespace,
  type Operation,
  type Program,
  type Service,
  type Type,
  type Union,
} from "@typespec/compiler";
import {
  Visibility,
  createMetadataInfo,
  getHttpService,
  resolveRequestVisibility,
  type HttpOperation,
} from "@typespec/http";
import {
  getAddedOnVersions,
  getRemovedOnVersions,
  getReturnTypeChangedFrom,
  getTypeChangedFrom,
  getVersions,
  resolveVersions,
  type Version,
} from "@typespec/versioning";
import {
  getArmCommonTypeOpenAPIRef,
  getArmCommonTypesVersion,
  getArmCommonTypesVersions,
  isArmCommonType,
} from "../common-types.js";
import { getArmProviderNamespace } from "../namespace.js";

export const useLatestVersionOfCommonTypesRule = createRule({
  name: "use-latest-version-of-common-types",
  docs: fileRef.fromPackageRoot("src/rules/use-latest-version-of-common-types.md"),
  description: "ARM services must use the latest available ARM common-types version.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-latest-version-of-common-types",
  messages: {
    default: paramMessage`Use the latest ARM common-types version '${"latestVersion"}' instead of '${"currentVersion"}'.`,
    reference: paramMessage`This API version already selects the latest ARM common-types version '${"latestVersion"}', but the common-type ${"referenceKind"} '${"referenceName"}' resolves to '${"fileName"}' version '${"currentVersion"}'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${"latestVersion"}'.`,
  },
  create(context) {
    return {
      root: (program) => {
        const latestVersion = tryGetLatestArmCommonTypesVersion(program);
        if (latestVersion === undefined) {
          return;
        }

        for (const service of listServices(program)) {
          if (!getArmProviderNamespace(program, service.type)) {
            continue;
          }

          const compilerService = getService(program, service.type);
          if (compilerService === undefined) {
            continue;
          }

          const versionResolutions = resolveVersions(program, service.type);
          if (versionResolutions.some((resolution) => resolution.rootVersion !== undefined)) {
            const [httpService] = getHttpService(program, service.type);
            for (const resolution of versionResolutions) {
              const version = resolution.rootVersion;
              if (version === undefined) {
                continue;
              }
              const currentVersion =
                getArmCommonTypesVersion(program, version.enumMember) ??
                getArmCommonTypesVersion(program, service.type);
              if (isOutdated(currentVersion, latestVersion)) {
                reportOutdatedSelection(context, version.enumMember, currentVersion, latestVersion);
                continue;
              }
              if (currentVersion === undefined) {
                continue;
              }

              reportOutdatedUsages(
                context,
                collectCommonTypeUsages(program, httpService.operations, resolution.versions),
                compilerService,
                version.value,
                latestVersion,
              );
            }
            continue;
          }

          const [httpService] = getHttpService(program, service.type);
          const versionContext = versionResolutions[0]?.versions;

          const currentVersion = getArmCommonTypesVersion(program, service.type);
          if (isOutdated(currentVersion, latestVersion)) {
            reportOutdatedSelection(context, service.type, currentVersion, latestVersion);
            continue;
          }
          if (currentVersion === undefined) {
            continue;
          }

          reportOutdatedUsages(
            context,
            collectCommonTypeUsages(program, httpService.operations, versionContext),
            compilerService,
            undefined,
            latestVersion,
          );
        }
      },
    };
  },
});

function tryGetLatestArmCommonTypesVersion(program: Program): string | undefined {
  const allVersions = getArmCommonTypesVersions(program)?.allVersions;
  if (allVersions === undefined || allVersions.length === 0) {
    return undefined;
  }

  return allVersions.reduce((latest, version) =>
    getVersionNumber(version.name) > getVersionNumber(latest.name) ? version : latest,
  ).name;
}

function getVersionNumber(version: string): number {
  const match = /^v(\d+)$/i.exec(version);
  return match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
}

function isOutdated(
  currentVersion: string | undefined,
  latestVersion: string,
): currentVersion is string {
  return currentVersion !== undefined && currentVersion !== latestVersion;
}

function reportOutdatedSelection(
  context: Parameters<typeof useLatestVersionOfCommonTypesRule.create>[0],
  target: Namespace | EnumMember,
  currentVersion: string,
  latestVersion: string,
): void {
  context.reportDiagnostic({
    target,
    format: {
      currentVersion,
      latestVersion,
      fileName: "common-types",
      referenceKind: "selection",
      referenceName: "common-types",
    },
  });
}

interface CommonTypeUsage {
  target: ModelProperty | Operation;
  type: Model | ModelProperty | Enum | Union;
}

interface PayloadContext {
  visibility: Visibility;
  inExplicitBody: boolean;
}

function collectCommonTypeUsages(
  program: Program,
  operations: readonly HttpOperation[],
  versions?: Map<Namespace, Version>,
): CommonTypeUsage[] {
  const usages: CommonTypeUsage[] = [];
  const seenTypes = new Map<ModelProperty | Operation, Map<Type, Set<string>>>();
  const seenUsages = new Map<ModelProperty | Operation, Set<Type>>();
  const metadataInfo = createMetadataInfo(program, {
    canonicalVisibility: Visibility.Read,
    canShareProperty: (property) => canSharePropertyUsingReadonlyOrXmsMutability(program, property),
  });

  const addUsage = (
    type: Model | ModelProperty | Enum | Union,
    target: ModelProperty | Operation,
  ) => {
    if (!isArmCommonType(type)) {
      return;
    }

    let targetTypes = seenUsages.get(target);
    if (targetTypes === undefined) {
      targetTypes = new Set();
      seenUsages.set(target, targetTypes);
    }

    if (!targetTypes.has(type)) {
      targetTypes.add(type);
      usages.push({ target, type });
    }
  };

  const visitType = (
    type: Type,
    target: ModelProperty | Operation,
    payloadContext: PayloadContext,
  ) => {
    if (!isAvailableAtVersion(program, type, versions)) {
      return;
    }

    let targetTypes = seenTypes.get(target);
    if (targetTypes === undefined) {
      targetTypes = new Map();
      seenTypes.set(target, targetTypes);
    }

    let typeContexts = targetTypes.get(type);
    if (typeContexts === undefined) {
      typeContexts = new Set();
      targetTypes.set(type, typeContexts);
    }

    const contextIdentity = `${payloadContext.visibility}:${payloadContext.inExplicitBody}`;
    if (typeContexts.has(contextIdentity)) {
      return;
    }
    typeContexts.add(contextIdentity);

    switch (type.kind) {
      case "Model":
        addUsage(type, target);
        if (type.indexer) {
          visitType(type.indexer.value, target, {
            ...payloadContext,
            visibility: isArrayModelType(type)
              ? payloadContext.visibility | Visibility.Item
              : payloadContext.visibility,
          });
        }
        for (const property of walkPropertiesInherited(type)) {
          if (
            !metadataInfo.isPayloadProperty(
              property,
              payloadContext.visibility,
              payloadContext.inExplicitBody,
            )
          ) {
            continue;
          }

          addPropertyUsages(property, target, payloadContext);
        }
        break;
      case "ModelProperty":
        addPropertyUsages(type, target, payloadContext);
        break;
      case "Enum":
      case "Union":
        addUsage(type, target);
        if (type.kind === "Union") {
          for (const variant of type.variants.values()) {
            if (isAvailableAtVersion(program, variant, versions)) {
              visitType(variant.type, target, payloadContext);
            }
          }
        }
        break;
      case "Tuple":
        for (const value of type.values) {
          visitType(value, target, {
            ...payloadContext,
            visibility: payloadContext.visibility | Visibility.Item,
          });
        }
        break;
    }
  };

  function addPropertyUsages(
    property: ModelProperty,
    target: ModelProperty | Operation,
    payloadContext: PayloadContext,
  ) {
    for (
      let current: ModelProperty | undefined = property;
      current !== undefined;
      current = current.sourceProperty
    ) {
      if (!isAvailableAtVersion(program, current, versions)) {
        continue;
      }
      addUsage(current, target);
      visitType(getTypeAtVersion(program, current, versions), target, payloadContext);
    }
  }

  for (const httpOperation of operations) {
    if (!isAvailableAtVersion(program, httpOperation.operation, versions)) {
      continue;
    }

    const requestContext = {
      visibility: resolveRequestVisibility(program, httpOperation.operation, httpOperation.verb),
      inExplicitBody: false,
    };
    for (const parameter of httpOperation.parameters.properties) {
      addPropertyUsages(parameter.property, httpOperation.operation, requestContext);
    }
    if (httpOperation.parameters.body) {
      const body = httpOperation.parameters.body;
      visitType(body.type, httpOperation.operation, {
        visibility: requestContext.visibility,
        inExplicitBody:
          body.bodyKind === "single" && body.isExplicit && body.containsMetadataAnnotations,
      });
    }

    const returnType = getReturnTypeAtVersion(program, httpOperation.operation, versions);
    if (returnType !== httpOperation.operation.returnType) {
      visitType(returnType, httpOperation.operation, {
        visibility: Visibility.Read,
        inExplicitBody: false,
      });
    } else {
      for (const response of httpOperation.responses) {
        for (const responseContent of response.responses) {
          if (responseContent.body) {
            const body = responseContent.body;
            visitType(body.type, httpOperation.operation, {
              visibility: Visibility.Read,
              inExplicitBody:
                body.bodyKind === "single" && body.isExplicit && body.containsMetadataAnnotations,
            });
          }
        }
      }
    }
  }

  return usages;
}

function isAvailableAtVersion(
  program: Program,
  type: Type,
  versions: Map<Namespace, Version> | undefined,
): boolean {
  if (versions === undefined) {
    return true;
  }

  for (let current: Type | undefined = type; current !== undefined; current = getParent(current)) {
    const version = getVersionForType(program, current, versions);
    if (version === undefined) {
      continue;
    }

    const changes = [
      ...(getAddedOnVersions(program, current) ?? []).map((changedAt) => ({
        changedAt,
        available: true,
      })),
      ...(getRemovedOnVersions(program, current) ?? []).map((changedAt) => ({
        changedAt,
        available: false,
      })),
    ].sort((left, right) => left.changedAt.index - right.changedAt.index);
    if (changes.length > 0) {
      let available = !changes[0].available;
      for (const change of changes) {
        if (change.changedAt.index > version.index) {
          break;
        }
        available = change.available;
      }
      return available;
    }
  }
  return true;
}

function getParent(type: Type): Type | undefined {
  switch (type.kind) {
    case "ModelProperty":
      return type.model;
    case "Operation":
      return type.interface ?? type.namespace;
    case "EnumMember":
      return type.enum;
    case "UnionVariant":
      return type.union;
    case "Interface":
    case "Model":
    case "Enum":
    case "Union":
    case "Scalar":
    case "Namespace":
      return type.namespace;
    default:
      return undefined;
  }
}

function getTypeAtVersion(
  program: Program,
  property: ModelProperty,
  versions: Map<Namespace, Version> | undefined,
): Type {
  const version = versions && getVersionForType(program, property, versions);
  if (version === undefined) {
    return property.type;
  }

  for (const [changedAtVersion, oldType] of getTypeChangedFrom(program, property) ?? []) {
    if (version.index < changedAtVersion.index) {
      return oldType;
    }
  }
  return property.type;
}

function getReturnTypeAtVersion(
  program: Program,
  operation: Operation,
  versions: Map<Namespace, Version> | undefined,
): Type {
  const version = versions && getVersionForType(program, operation, versions);
  if (version === undefined) {
    return operation.returnType;
  }

  for (const [changedAtVersion, oldType] of getReturnTypeChangedFrom(program, operation) ?? []) {
    if (version.index < changedAtVersion.index) {
      return oldType;
    }
  }
  return operation.returnType;
}

function getVersionForType(
  program: Program,
  type: Type,
  versions: Map<Namespace, Version>,
): Version | undefined {
  const [versionedNamespace] = getVersions(program, type);
  for (
    let namespace = versionedNamespace;
    namespace !== undefined;
    namespace = namespace.namespace
  ) {
    const version = versions.get(namespace);
    if (version !== undefined) {
      return version;
    }
  }
  return undefined;
}

function canSharePropertyUsingReadonlyOrXmsMutability(
  program: Program,
  property: ModelProperty,
): boolean {
  const sharedVisibilities = new Set(["Read", "Create", "Update"]);
  const lifecycle = getLifecycleVisibilityEnum(program);
  const visibilities = getVisibilityForClass(program, property, lifecycle);
  if (visibilities.size !== lifecycle.members.size) {
    for (const visibility of visibilities) {
      if (!sharedVisibilities.has(visibility.name)) {
        return false;
      }
    }
  }

  return visibilities.size !== 0;
}

function reportOutdatedUsages(
  context: Parameters<typeof useLatestVersionOfCommonTypesRule.create>[0],
  usages: CommonTypeUsage[],
  service: Service,
  apiVersion: string | undefined,
  latestVersion: string,
): void {
  const reported = new Map<ModelProperty | Operation, Set<string>>();

  for (const usage of usages) {
    const reference = getArmCommonTypeOpenAPIRef(context.program, usage.type, {
      service,
      version: apiVersion,
    });
    const parsedReference = parseCommonTypesReference(reference);
    if (parsedReference === undefined || parsedReference.version === latestVersion) {
      continue;
    }

    const identity = `${parsedReference.fileName}\0${parsedReference.version}\0${parsedReference.referenceKind}\0${parsedReference.referenceName}`;
    let targetReferences = reported.get(usage.target);
    if (targetReferences === undefined) {
      targetReferences = new Set();
      reported.set(usage.target, targetReferences);
    }
    if (targetReferences.has(identity)) {
      continue;
    }
    targetReferences.add(identity);

    context.reportDiagnostic({
      messageId: "reference",
      target: usage.target,
      format: {
        currentVersion: parsedReference.version,
        latestVersion,
        fileName: parsedReference.fileName,
        referenceKind: parsedReference.referenceKind,
        referenceName: parsedReference.referenceName,
      },
    });
  }
}

function parseCommonTypesReference(reference: string | undefined):
  | {
      version: string;
      fileName: string;
      referenceKind: string;
      referenceName: string;
    }
  | undefined {
  const match = reference?.match(
    /(?:resource-management\/|\{arm-types-dir\}\/)(v\d+)\/([^/#]+\.json)#\/([^/]+)\/([^/]+)$/i,
  );
  return match
    ? {
        version: match[1].toLowerCase(),
        fileName: match[2].toLowerCase(),
        referenceKind: match[3].replace(/s$/i, "").toLowerCase(),
        referenceName: decodeURIComponent(match[4]),
      }
    : undefined;
}
