import { AzureCoreStateKeys } from "./lib.js";

import { DecoratorContext, Model, ModelProperty, Program } from "@typespec/compiler";
import { getUniqueItems } from "./decorators/unique-items.js";

export const $requestParameter = (context: DecoratorContext, entity: Model, name: string) => {
  context.program.stateMap(AzureCoreStateKeys.requestParameter).set(entity, name);
};

export function getRequestParameter(program: Program, entity: ModelProperty): string | undefined {
  if (entity.type.kind !== "Model") return undefined;
  const parameterName: string | undefined = program
    .stateMap(AzureCoreStateKeys.requestParameter)
    .get(entity.type);
  return parameterName;
}

export const $responseProperty = (context: DecoratorContext, entity: Model, name: string) => {
  context.program.stateMap(AzureCoreStateKeys.responseParameter).set(entity, name);
};

export function getResponseProperty(program: Program, entity: ModelProperty): string | undefined {
  if (entity.type.kind !== "Model") return undefined;
  const parameterName: string | undefined = program
    .stateMap(AzureCoreStateKeys.responseParameter)
    .get(entity.type);
  return parameterName;
}

/**
 * Checks if an array model or array-valued model property has unique items.
 * @param program The program context.
 * @param type The model or model property to check.
 * @returns True if the model or model property has unique items, false otherwise.
 */
export function hasUniqueItems(program: Program, type: Model | ModelProperty): boolean {
  const cache = new WeakMap<Model | ModelProperty, boolean>();
  return hasUniqueItemsCached(type);
  function cacheResult(type: Model | ModelProperty, result: boolean): boolean {
    cache.set(type, result);
    return result;
  }
  function hasUniqueItemsCached(type: Model | ModelProperty): boolean {
    if (cache.has(type)) {
      return cache.get(type)!;
    }

    if (type.kind === "Model") {
      return cacheResult(
        type,
        getUniqueItems(program, type) ||
          (type.baseModel !== undefined && hasUniqueItemsCached(type.baseModel)) ||
          (type.sourceModel !== undefined && hasUniqueItemsCached(type.sourceModel)) ||
          (type.sourceModels !== undefined &&
            type.sourceModels.some((sourceModel) => hasUniqueItemsCached(sourceModel.model))),
      );
    } else {
      if (type.type.kind !== "Model") {
        return cacheResult(type, false);
      }
      return cacheResult(type, getUniqueItems(program, type) || hasUniqueItemsCached(type.type));
    }
  }
}
