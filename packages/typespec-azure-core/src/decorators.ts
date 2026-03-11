import { AzureCoreStateKeys } from "./lib.js";

import { DecoratorContext, Model, ModelProperty, Program, Type } from "@typespec/compiler";
import { getUniqueItems } from "./decorators/unique-items.js";


/**
 * Checks if an array model or array-valued model property has 
 e items.
 * @param program The program context.
 * @param type The model or model property to check.
 * @returns True if the model or model property has unique items, false otherwise.
 */
export function hasUniqueItems(program: Program, type: Type): boolean {
  const cache = new WeakMap<Type, boolean>();
  return hasUniqueItemsCached(type);
  function cacheResult(type: Type, result: boolean): boolean {
    cache.set(type, result);
    return result;
  }
  function hasUniqueItemsCached(type: Type): boolean {
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
      if (type.kind !== "ModelProperty") {
        return cacheResult(type, false);
      }
      return cacheResult(type, getUniqueItems(program, type) || hasUniqueItemsCached(type.type));
    }
  }
}
