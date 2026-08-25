import {
  compilerAssert,
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
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import {
  Visibility,
  createMetadataInfo,
  getHttpService,
  resolveRequestVisibility,
  type HttpOperation,
} from "@typespec/http";
import { getVersioningMutators } from "@typespec/versioning";
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

          const versioning = getVersioningMutators(program, service.type);
          if (versioning?.kind === "versioned") {
            for (const snapshot of versioning.snapshots) {
              const currentVersion =
                getArmCommonTypesVersion(program, snapshot.version.enumMember) ??
                getArmCommonTypesVersion(program, service.type);
              if (isOutdated(currentVersion, latestVersion)) {
                reportOutdatedSelection(
                  context,
                  snapshot.version.enumMember,
                  currentVersion,
                  latestVersion,
                );
                continue;
              }
              if (currentVersion === undefined) {
                continue;
              }

              const projected = unsafe_mutateSubgraphWithNamespace(
                program,
                [snapshot.mutator],
                service.type,
              );
              compilerAssert(
                projected.type.kind === "Namespace",
                "A versioned service must project to a namespace.",
              );
              const projectedService = getService(program, projected.type) ?? {
                type: projected.type,
              };
              const [httpService] = getHttpService(program, projected.type);
              reportOutdatedUsages(
                context,
                collectCommonTypeUsages(program, httpService.operations),
                projectedService,
                snapshot.version.value,
                latestVersion,
              );
            }
            continue;
          }

          let analyzedService = service.type;
          if (versioning?.kind === "transient") {
            const projected = unsafe_mutateSubgraphWithNamespace(
              program,
              [versioning.mutator],
              service.type,
            );
            compilerAssert(
              projected.type.kind === "Namespace",
              "A transiently versioned service must project to a namespace.",
            );
            analyzedService = projected.type;
          }

          const currentVersion = getArmCommonTypesVersion(program, service.type);
          if (isOutdated(currentVersion, latestVersion)) {
            reportOutdatedSelection(context, service.type, currentVersion, latestVersion);
            continue;
          }
          if (currentVersion === undefined) {
            continue;
          }

          const [httpService] = getHttpService(program, analyzedService);
          reportOutdatedUsages(
            context,
            collectCommonTypeUsages(program, httpService.operations),
            getService(program, analyzedService) ?? compilerService,
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
            visitType(variant.type, target, payloadContext);
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
      addUsage(current, target);
      visitType(current.type, target, payloadContext);
    }
  }

  for (const httpOperation of operations) {
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

  return usages;
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
