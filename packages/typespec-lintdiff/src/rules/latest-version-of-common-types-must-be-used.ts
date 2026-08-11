import {
  createRule,
  getService,
  paramMessage,
  walkPropertiesInherited,
  type Enum,
  type EnumMember,
  type Model,
  type ModelProperty,
  type Namespace,
  type Operation,
  type Program,
  type Type,
  type Union,
} from "@typespec/compiler";
import {
  getArmCommonTypeOpenAPIRef,
  getArmCommonTypesVersion,
  getArmCommonTypesVersions,
  getArmProviderNamespace,
  isArmCommonType,
} from "@azure-tools/typespec-azure-resource-manager";
import { getAllHttpServices, type HttpOperation } from "@typespec/http";
import { Availability, getAvailabilityMap, getVersion, type Version } from "@typespec/versioning";

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

        const [services] = getAllHttpServices(program);
        for (const service of services) {
          if (!getArmProviderNamespace(program, service.namespace)) {
            continue;
          }

          const compilerService = getService(program, service.namespace);
          if (compilerService === undefined) {
            continue;
          }

          const usages = collectCommonTypeUsages(service.operations);
          const versionMap = getVersion(program, service.namespace);
          if (versionMap) {
            for (const version of versionMap.getVersions()) {
              const currentVersion =
                getArmCommonTypesVersion(program, version.enumMember) ??
                getArmCommonTypesVersion(program, service.namespace);
              if (
                reportIfOutdated(
                  context,
                  version.enumMember,
                  currentVersion,
                  latestVersion,
                )
              ) {
                continue;
              }
              reportOutdatedUsages(
                context,
                usages,
                compilerService,
                version,
                latestVersion,
              );
            }
            continue;
          }

          const currentVersion = getArmCommonTypesVersion(program, service.namespace);
          if (
            !reportIfOutdated(
              context,
              service.namespace,
              currentVersion,
              latestVersion,
            )
          ) {
            reportOutdatedUsages(
              context,
              usages,
              compilerService,
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
  service: NonNullable<ReturnType<typeof getService>>,
  version: Version | undefined,
  latestVersion: string,
): void {
  const reported = new Set<string>();

  for (const usage of usages) {
    if (version && !isAvailableInVersion(context.program, usage.target, version)) {
      continue;
    }

    const reference = getArmCommonTypeOpenAPIRef(context.program, usage.type, {
      service,
      version: version?.value,
    });
    const parsedReference = parseCommonTypesReference(reference);
    if (
      parsedReference === undefined ||
      parsedReference.version === latestVersion
    ) {
      continue;
    }

    const identity = `${parsedReference.fileName}\0${parsedReference.version}`;
    if (reported.has(identity)) {
      continue;
    }
    reported.add(identity);

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

function isAvailableInVersion(
  program: Program,
  target: ModelProperty | Operation,
  version: Version,
): boolean {
  const availability = getAvailabilityMap(program, target)?.get(version.name);
  return (
    availability === undefined ||
    availability === Availability.Added ||
    availability === Availability.Available
  );
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
