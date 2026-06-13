import { DecoratorContext, Model, isTemplateDeclaration } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { AzureBaseTypeDecorator } from "../generated-defs/Azure.ResourceManager.BaseTypes.js";
import { ArmStateKeys } from "./state.js";

export interface AzureBaseTypeInfo {
  /** The registered name of the base type */
  baseType: string;
  /** The version of the base type definition */
  version: string;
}

export const [getAzureBaseTypes, setAzureBaseTypes] = useStateMap<Model, AzureBaseTypeInfo[]>(
  ArmStateKeys.azureBaseTypes,
);

/**
 * Implementation for the `@azureBaseType` decorator.
 * Adds a single base type entry to the target model. Multiple applications
 * accumulate entries; duplicates (same baseType + version) are ignored.
 */
export const $azureBaseType: AzureBaseTypeDecorator = (
  context: DecoratorContext,
  target: Model,
  baseType: { baseType: string; version: string },
) => {
  if (isTemplateDeclaration(target)) return;

  const { program } = context;
  const existing = getAzureBaseTypes(program, target) ?? [];

  // Deduplicate by baseType + version
  const isDuplicate = existing.some(
    (entry) => entry.baseType === baseType.baseType && entry.version === baseType.version,
  );

  if (!isDuplicate) {
    setAzureBaseTypes(program, target, [...existing, { ...baseType }]);
  }
};
