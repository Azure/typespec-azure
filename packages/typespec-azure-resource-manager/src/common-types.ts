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
  isTypeSpecValueTypeOf,
} from "@typespec/compiler";
import { $useDependency, getVersion } from "@typespec/versioning";
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

export function getArmCommonTypesVersions(program: Program): ArmCommonTypeVersions | undefined {
  // There is a single instance of ArmCommonTypeVersions stored inside of the
  // state map so just pull the first (only) item from the map.
  const map: Map<Type, any> = program.stateMap(ArmStateKeys.armCommonTypesVersions);
  return map?.values().next().value as any;
}

/**
 * Check if a given model or model property is an ARM common type.
 * @param {Type} entity - The entity to be checked.
 *  @return {boolean} - A boolean value indicating whether an entity is an ARM common type.
 */
export function isArmCommonType(entity: Type): boolean {
  const commonDecorators = ["$armCommonDefinition", "$armCommonParameter"];
  if (isTypeSpecValueTypeOf(entity, ["Model", "ModelProperty"])) {
    return commonDecorators.some((commonDecorator) =>
      entity.decorators.some((d) => d.decorator.name === commonDecorator)
    );
  }
  return false;
}

/**
 * `@armCommonTypesVersion` sets the ARM common-types version used by the service.
 * @param {DecoratorContext} context DecoratorContext object
 * @param {type} entity Target of the decorator. Must be `Namespace` or `EnumMember` type
 */
export function $armCommonTypesVersion(
  context: DecoratorContext,
  entity: Namespace | EnumMember,
  version: EnumValue
) {
  context.program.stateMap(ArmStateKeys.armCommonTypesVersion).set(entity, version.value.name);

  context.call($useDependency, entity, version.value);
}

/**
 * Returns the ARM common-types version used by the service.
 * @param {DecoratorContext} context DecoratorContext object
 * @param {type} entity Target of the decorator. Must be `Namespace` or `EnumMember` type
 */
export function getArmCommonTypesVersion(
  program: Program,
  entity: Namespace | EnumMember
): string | undefined {
  return program.stateMap(ArmStateKeys.armCommonTypesVersion).get(entity);
}

/**
 * Get the common-types.json ref for the given common type.
 */
export function getArmCommonTypeOpenAPIRef(
  program: Program,
  entity: Model | ModelProperty,
  params: ArmCommonTypesResolutionOptions
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
  entity: Model | ModelProperty,
  params: ArmCommonTypesResolutionOptions
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
  } else {
    // If no version was found, use the default version
    record = records[defaultKey ?? ArmCommonTypesDefaultVersion];
  }

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
  params: ArmCommonTypesResolutionOptions
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
