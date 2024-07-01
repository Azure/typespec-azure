import {
  DecoratorContext,
  Enum,
  EnumValue,
  Model,
  ModelProperty,
  Program,
} from "@typespec/compiler";
import { ArmStateKeys } from "./state.js";

export const namespace = "Azure.ResourceManager.CommonTypes.Private";

export const ArmCommonTypesDefaultVersion = "v3";

function getArmTypesPath(program: Program): string {
  return program.getOption("arm-types-path") || "{arm-types-dir}";
}

function storeCommonTypeRecord(
  context: DecoratorContext,
  entity: Model | ModelProperty,
  kind: "definitions" | "parameters",
  name: string,
  version?: string | EnumValue | ArmCommonTypeVersionSpec,
  referenceFile?: string
): void {
  const basePath: string = getArmTypesPath(context.program).trim();

  // NOTE: Right now we don't try to prevent multiple versions from declaring that they are the default
  let isDefault = false;
  if (version && typeof version !== "string" && !("valueKind" in version)) {
    isDefault = !!version.isDefault;
    version = version.version;
  }

  // for backward compatibility, skip if we are trying to access a non-default file and emit the type
  if ((version || referenceFile) && basePath.endsWith(".json")) return;
  if (!version) version = ArmCommonTypesDefaultVersion;
  if (!referenceFile) referenceFile = "types.json";

  const versionStr = typeof version === "string" ? version : version.value.name;
  const records = getCommonTypeRecords(context.program, entity);

  records.records[versionStr] = {
    name,
    kind,
    version: versionStr,
    basePath,
    referenceFile,
  };
  if (isDefault) {
    records.defaultKey = versionStr;
  }
  context.program.stateMap(ArmStateKeys.armCommonDefinitions).set(entity, records);
}

export interface ArmCommonTypeRecord {
  name: string;
  kind: "definitions" | "parameters";
  version: string;
  basePath: string;
  referenceFile?: string;
}

export interface ArmCommonTypeRecords {
  records: { [key: string]: ArmCommonTypeRecord };
  defaultKey?: string;
}

export function getCommonTypeRecords(
  program: Program,
  entity: Model | ModelProperty
): ArmCommonTypeRecords {
  return program.stateMap(ArmStateKeys.armCommonDefinitions).get(entity) ?? { records: {} };
}

interface ArmCommonTypeVersionSpec {
  version: string | EnumValue;
  isDefault: boolean;
}

/**
 * Refer an model property to be a common ARM parameter
 * @param {DecoratorContext} context DecoratorContext object
 * @param {Type} entity Decorator target type. Must be `Model`
 * @param {string?} definitionName Optional definition name
 * @param {string?} version Optional version
 * @param {string?} referenceFile Optional common file path
 * @returns void
 */
export function $armCommonParameter(
  context: DecoratorContext,
  entity: ModelProperty,
  parameterName?: string,
  version?: string | EnumValue | ArmCommonTypeVersionSpec,
  referenceFile?: string
): void {
  // Use the name of the model type if not specified
  if (!parameterName) {
    parameterName = entity.name;
  }

  storeCommonTypeRecord(context, entity, "parameters", parameterName, version, referenceFile);
}

/**
 * Using ARM common definition for a Model
 * @param {DecoratorContext} context DecoratorContext object
 * @param {Type} entity Decorator target type. Must be `Model`
 * @param {string?} definitionName Optional definition name
 * @param {string?} version Optional version
 * @param {string?} referenceFile Optional common file path
 * @returns {void}
 */
export function $armCommonDefinition(
  context: DecoratorContext,
  entity: Model,
  definitionName?: string,
  version?: string | EnumValue | ArmCommonTypeVersionSpec,
  referenceFile?: string
): void {
  // Use the name of the model type if not specified
  if (!definitionName) {
    definitionName = entity.name;
  }

  storeCommonTypeRecord(context, entity, "definitions", definitionName, version, referenceFile);
}

/**
 * Specify the ARM commont type version reference for a particular spec version or namespace.
 * @param {DecoratorContext} context DecoratorContext object
 * @param {enumType} entity Decorator target type. Must be `Model`
 * @returns {void}
 */
export function $armCommonTypesVersions(context: DecoratorContext, enumType: Enum) {
  context.program.stateMap(ArmStateKeys.armCommonTypesVersions).set(enumType, {
    type: enumType,
    allVersions: Array.from(enumType.members.values()).reverse(),
  });
}
