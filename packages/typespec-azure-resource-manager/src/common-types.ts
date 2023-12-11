import {
  DecoratorContext,
  Enum,
  EnumMember,
  Namespace,
  Program,
  Type,
  isTypeSpecValueTypeOf,
} from "@typespec/compiler";
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
  version: string | EnumMember
) {
  context.program
    .stateMap(ArmStateKeys.armCommonTypesVersion)
    .set(entity, typeof version === "string" ? version : version.name);
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
