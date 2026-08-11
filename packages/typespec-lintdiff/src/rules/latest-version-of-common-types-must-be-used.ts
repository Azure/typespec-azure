import {
  compilerAssert,
  createRule,
  getService,
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
  getArmCommonTypeOpenAPIRef,
  getArmCommonTypesVersion,
  getArmCommonTypesVersions,
  getArmProviderNamespace,
  isArmCommonType,
} from "@azure-tools/typespec-azure-resource-manager";
import { getHttpService, type HttpOperation } from "@typespec/http";
import { getVersioningMutators } from "@typespec/versioning";

export const latestVersionOfCommonTypesMustBeUsedRule = createRule({
  name: "latest-version-of-common-types-must-be-used",
  description: "ARM services must use the latest available ARM common-types version.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Use the latest ARM common-types version '${"latestVersion"}' instead of '${"currentVersion"}'.`,
    reference:
      paramMessage`This API version already selects the latest ARM common-types version '${"latestVersion"}', but the common-type ${"referenceKind"} '${"referenceName"}' resolves to '${"fileName"}' version '${"currentVersion"}'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${"latestVersion"}'.`,
  },
  create(context) {
    return {
      root: (program) => {
        const latestVersion = getLatestArmCommonTypesVersion(program);
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
              if (
                reportIfOutdated(
                  context,
                  snapshot.version.enumMember,
                  currentVersion,
                  latestVersion,
                )
              ) {
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
              const projectedService =
                getService(program, projected.type) ?? { type: projected.type };
              const [httpService] = getHttpService(program, projected.type);
              reportOutdatedUsages(
                context,
                collectCommonTypeUsages(httpService.operations),
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
          if (
            !reportIfOutdated(
              context,
              service.type,
              currentVersion,
              latestVersion,
            )
          ) {
            const [httpService] = getHttpService(program, analyzedService);
            reportOutdatedUsages(
              context,
              collectCommonTypeUsages(httpService.operations),
              getService(program, analyzedService) ?? compilerService,
              undefined,
              latestVersion,
            );
          }
        }
      },
    };
  },
});

function getLatestArmCommonTypesVersion(program: Program): string | undefined {
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

function reportIfOutdated(
  context: Parameters<typeof latestVersionOfCommonTypesMustBeUsedRule.create>[0],
  target: Namespace | EnumMember,
  currentVersion: string | undefined,
  latestVersion: string,
): boolean {
  if (currentVersion === undefined || currentVersion === latestVersion) {
    return false;
  }

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
  return true;
}

interface CommonTypeUsage {
  target: ModelProperty | Operation;
  type: Model | ModelProperty | Enum | Union;
}

function collectCommonTypeUsages(
  operations: readonly HttpOperation[],
): CommonTypeUsage[] {
  const usages: CommonTypeUsage[] = [];
  const seenTypes = new Map<ModelProperty | Operation, Set<Type>>();
  const seenUsages = new Map<ModelProperty | Operation, Set<Type>>();

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

  const visitType = (type: Type, target: ModelProperty | Operation) => {
    let targetTypes = seenTypes.get(target);
    if (targetTypes === undefined) {
      targetTypes = new Set();
      seenTypes.set(target, targetTypes);
    }
    if (targetTypes.has(type)) {
      return;
    }
    targetTypes.add(type);

    switch (type.kind) {
      case "Model":
        addUsage(type, target);
        if (type.indexer) {
          visitType(type.indexer.value, target);
        }
        for (const property of walkPropertiesInherited(type)) {
          addPropertyUsages(property, target);
          visitType(property.type, target);
        }
        break;
      case "ModelProperty":
        addPropertyUsages(type, target);
        visitType(type.type, target);
        break;
      case "Enum":
      case "Union":
        addUsage(type, target);
        if (type.kind === "Union") {
          for (const variant of type.variants.values()) {
            visitType(variant.type, target);
          }
        }
        break;
      case "Tuple":
        for (const value of type.values) {
          visitType(value, target);
        }
        break;
    }
  };

  function addPropertyUsages(
    property: ModelProperty,
    target: ModelProperty | Operation,
  ) {
    for (
      let current: ModelProperty | undefined = property;
      current !== undefined;
      current = current.sourceProperty
    ) {
      addUsage(current, target);
      visitType(current.type, target);
    }
  }

  for (const httpOperation of operations) {
    for (const parameter of httpOperation.parameters.properties) {
      addPropertyUsages(parameter.property, httpOperation.operation);
    }
    if (httpOperation.parameters.body) {
      visitType(httpOperation.parameters.body.type, httpOperation.operation);
    }
    for (const response of httpOperation.responses) {
      for (const responseContent of response.responses) {
        if (responseContent.body) {
          visitType(responseContent.body.type, httpOperation.operation);
        }
      }
    }
  }

  return usages;
}

function reportOutdatedUsages(
  context: Parameters<typeof latestVersionOfCommonTypesMustBeUsedRule.create>[0],
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
    if (
      parsedReference === undefined ||
      parsedReference.version === latestVersion
    ) {
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

function parseCommonTypesReference(
  reference: string | undefined,
): {
  version: string;
  fileName: string;
  referenceKind: string;
  referenceName: string;
} | undefined {
  const match =
    reference?.match(
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
