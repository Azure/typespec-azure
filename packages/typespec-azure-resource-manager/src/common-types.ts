import {
  DecoratorContext,
  Diagnostic,
  Enum,
  EnumMember,
  EnumValue,
  Model,
  ModelProperty,
  Namespace,
  Program,
  Service,
  Type,
  Union,
  isTypeSpecValueTypeOf,
} from "@typespec/compiler";
import { $useDependency, getVersion } from "@typespec/versioning";
import { ArmCommonTypesVersionDecorator } from "../generated-defs/Azure.ResourceManager.js";
import {
  ArmCommonTypeRecord,
  ArmCommonTypesDefaultVersion,
  getCommonTypeRecords,
} from "./commontypes.private.decorators.js";
import { createDiagnostic } from "./lib.js";
import { ArmStateKeys } from "./state.js";

export interface ArmCommonTypeVersions {
  type: Enum;
  allVersions: EnumMember[];
}

export function getArmCommonTypesVersions(program: Program): ArmCommonTypeVersions {
  // There is a single instance of ArmCommonTypeVersions stored inside of the
  // state map so just pull the first (only) item from the map.
  const map: Map<Type, any> = program.stateMap(ArmStateKeys.armCommonTypesVersions);
  return map?.values().next().value as any;
}

export function getArmCommonTypesVersionFromString(
  program: Program,
  entity: Namespace | EnumMember,
  versionStr: string,
): [EnumMember | undefined, readonly Diagnostic[]] {
  const commonTypeVersionEnum = program.resolveTypeReference(
    `Azure.ResourceManager.CommonTypes.Versions.${versionStr}`,
  )[0] as EnumMember;
  if (commonTypeVersionEnum === undefined) {
    return [
      undefined,
      [
        createDiagnostic({
          code: "arm-common-types-invalid-version",
          target: entity,
          format: {
            versionString: versionStr,
            supportedVersions: [...getArmCommonTypesVersions(program).type.members.keys()].join(
              ", ",
            ),
          },
        }),
      ],
    ];
  } else {
    return [commonTypeVersionEnum, []];
  }
}

/**
 * Check if a given model or model property is an ARM common type.
 * @param {Type} entity - The entity to be checked.
 *  @return {boolean} - A boolean value indicating whether an entity is an ARM common type.
 */
export function isArmCommonType(entity: Type): boolean {
  const commonDecorators = ["$armCommonDefinition", "$armCommonParameter"];
  if (isTypeSpecValueTypeOf(entity, ["Model", "ModelProperty", "Enum", "Union"])) {
    return commonDecorators.some((commonDecorator) =>
      entity.decorators.some((d) => d.decorator.name === commonDecorator),
    );
  }
  return false;
}

/**
 * `@armCommonTypesVersion` sets the ARM common-types version used by the service.
 * @param {DecoratorContext} context DecoratorContext object
 * @param {type} entity Target of the decorator. Must be `Namespace` or `EnumMember` type
 */
export const $armCommonTypesVersion: ArmCommonTypesVersionDecorator = (
  context: DecoratorContext,
  entity: Namespace | EnumMember,
  version: string | EnumValue,
) => {
  // try convert string to EnumMember
  let versionEnum: EnumMember;
  if (typeof version === "string") {
    const [foundEnumMember, diagnostics] = getArmCommonTypesVersionFromString(
      context.program,
      entity,
      version,
    );
    if (!foundEnumMember) {
      context.program.reportDiagnostics(diagnostics);
      return;
    }
    versionEnum = foundEnumMember as EnumMember;
  } else {
    versionEnum = version.value;
  }

  context.program.stateMap(ArmStateKeys.armCommonTypesVersion).set(entity, versionEnum.name);

  if (entity.kind === "Namespace") {
    const versioned = entity.decorators.find((x) => x.definition?.name === "@versioned");
    // If it is versioned namespace, we will skip adding @useDependency to namespace
    if (versioned) {
      return;
    }
  }
  // Add @useDependency on version enum members or on unversioned namespace
  context.call($useDependency, entity, versionEnum);
};

/**
 * Returns the ARM common-types version used by the service.
 * @param {DecoratorContext} context DecoratorContext object
 * @param {type} entity Target of the decorator. Must be `Namespace` or `EnumMember` type
 */
export function getArmCommonTypesVersion(
  program: Program,
  entity: Namespace | EnumMember,
): string | undefined {
  return program.stateMap(ArmStateKeys.armCommonTypesVersion).get(entity);
}

/**
 * Get the common-types.json ref for the given common type.
 */
export function getArmCommonTypeOpenAPIRef(
  program: Program,
  entity: Model | ModelProperty | Enum | Union,
  params: ArmCommonTypesResolutionOptions,
): string | undefined {
  const [record, diagnostics] = findArmCommonTypeRecord(program, entity, params);

  if (record) {
    return record.basePath.endsWith(".json")
      ? `${record.basePath}#/${record.kind}/${record.name}`
      : `${record.basePath}/${record.version}/${record.referenceFile}#/${record.kind}/${record.name}`;
  } else {
    program.reportDiagnostics(diagnostics);
    return undefined;
  }
}

interface CommonTypesVersion {
  selectedVersion?: string;
  allVersions: EnumMember[];
}

export interface ArmCommonTypesResolutionOptions {
  readonly service: Service;
  readonly version?: string;
}

export function findArmCommonTypeRecord(
  program: Program,
  entity: Model | ModelProperty | Enum | Union,
  params: ArmCommonTypesResolutionOptions,
): [ArmCommonTypeRecord | undefined, readonly Diagnostic[]] {
  const { records, defaultKey } = getCommonTypeRecords(program, entity);

  const commonTypes = resolveCommonTypesVersion(program, params);
  const selectedVersion = commonTypes.selectedVersion;
  // Find closest version that matches the dependency (based on version enum order)
  let record: ArmCommonTypeRecord | undefined;
  if (selectedVersion) {
    let foundSelectedVersion = false;
    for (const version of commonTypes.allVersions) {
      if (!foundSelectedVersion) {
        if (selectedVersion !== version.name) {
          continue;
        }

        foundSelectedVersion = true;
      }

      const maybeRecord = records[version.name];
      if (maybeRecord) {
        record = maybeRecord;
        break;
      }
    }
  }
  if (record === undefined) {
    // If no version was found, use the default version
    record = records[defaultKey ?? ArmCommonTypesDefaultVersion];
  }

  // If after resolve version AND unable to load default version, report diagnostic
  if (record === undefined) {
    return [
      undefined,
      [
        createDiagnostic({
          code: "arm-common-types-incompatible-version",
          target: entity,
          format: {
            selectedVersion: selectedVersion ?? ArmCommonTypesDefaultVersion,
            supportedVersions: Object.keys(records).join(", "),
          },
        }),
      ],
    ];
  } else {
    return [record, []];
  }
}
/**
 * Resolve which version of the Common Types to use.
 */
function resolveCommonTypesVersion(
  program: Program,
  params: ArmCommonTypesResolutionOptions,
): CommonTypesVersion {
  let selectedVersion: string | undefined;
  const { allVersions } = getArmCommonTypesVersions(program) ?? {};

  const versionMap = getVersion(program, params.service.type);

  // If the service is versioned, extract the common-types version from the
  // service version enum
  if (params.version && versionMap) {
    const versionEnumMember = versionMap
      .getVersions()
      .find((x) => x.value === params.version)?.enumMember;
    if (versionEnumMember) {
      selectedVersion = getArmCommonTypesVersion(program, versionEnumMember);
    }
  }

  // Extract the version from the service namespace instead
  if (selectedVersion === undefined) {
    selectedVersion = getArmCommonTypesVersion(program, params.service.type);
  }

  return {
    selectedVersion,
    allVersions: allVersions ?? [],
  };
}
