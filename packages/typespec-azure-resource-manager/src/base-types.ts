import { DecoratorContext, Model, isTemplateDeclaration } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { AzureBaseTypeDecorator } from "../generated-defs/Azure.ResourceManager.js";
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
 * Stores base type metadata on the target model.
 */
export const $azureBaseType: AzureBaseTypeDecorator = (
  context: DecoratorContext,
  target: Model,
  baseTypes: readonly { baseType: string; version: string }[],
) => {
  if (isTemplateDeclaration(target)) return;

  const { program } = context;
  const infos: AzureBaseTypeInfo[] = baseTypes.map((bt) => ({
    baseType: bt.baseType,
    version: bt.version,
  }));

  if (infos.length > 0) {
    const existing = getAzureBaseTypes(program, target) ?? [];
    setAzureBaseTypes(program, target, [...existing, ...infos]);
  }
};
