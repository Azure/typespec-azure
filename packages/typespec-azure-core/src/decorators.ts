import { AzureCoreStateKeys } from "./lib.js";

import {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  $decorators,
  DecoratorContext,
  Model,
  ModelProperty,
  Operation,
  Program,
  Type,
} from "@typespec/compiler";
import {
  ItemsDecorator,
  NextPageOperationDecorator,
  PagedResultDecorator,
} from "../generated-defs/Azure.Core.js";
import { $operationLink, getOperationLink } from "./decorators/operation-link.js";
import { getUniqueItems } from "./decorators/unique-items.js";

// pagedResult

export const $pagedResult: PagedResultDecorator = (context: DecoratorContext, entity: Model) => {
  context.program.stateMap(AzureCoreStateKeys.pagedResult).set(entity, true);
};

export interface PagedResultMetadata {
  modelType: Model;
  itemsProperty?: ModelProperty;
  /** @deprecated use itemsSegments  */
  itemsPath?: string;
  /** Path to the items property. */
  itemsSegments?: string[];
  nextLinkProperty?: ModelProperty;
  /** @deprecated use nextLinkSegments */
  nextLinkPath?: string;
  /** Path to the next link property. */
  nextLinkSegments?: string[];
  nextLinkOperation?: Operation;
}

interface PropertyPath {
  path: string;
  segments: string[];
  property: ModelProperty;
}

function findPathToProperty(
  program: Program,
  entity: Model,
  condition: (prop: ModelProperty) => boolean,
  current: string[] = [],
): PropertyPath | undefined {
  for (const prop of entity.properties.values()) {
    const match = condition(prop);
    if (match) {
      const segments = [...current, prop.name];
      return {
        property: prop,
        path: segments.join("."),
        segments,
      };
    } else {
      if (prop.type.kind === "Model") {
        const items = findPathToProperty(program, prop.type, condition, [...current, prop.name]);
        if (items !== undefined) {
          return items;
        }
      }
    }
  }
  return undefined;
}

function _getItems(program: Program, entity: Model): PropertyPath | undefined {
  return findPathToProperty(program, entity, (prop) => getItems(program, prop) !== undefined);
}

function _getNextLink(program: Program, entity: Model): PropertyPath | undefined {
  return findPathToProperty(program, entity, (prop) => getNextLink(program, prop) === true);
}

/**
 * Find all named models that could have been the source of the given
 * property. This includes the named parents of all property sources in a
 * chain.
 */
function getNamedSourceModels(property: ModelProperty): Set<Model> | undefined {
  if (!property.sourceProperty) {
    return undefined;
  }
  const set = new Set<Model>();
  for (let p: ModelProperty | undefined = property; p; p = p.sourceProperty) {
    if (p.model?.name) {
      set.add(p.model);
    }
  }
  return set;
}

/**
 * Retrieves PagedResultMetadata for a model, if available. If passed an
 * operation, this will search the operations return type for any paged
 * response and return the PagedResultMetadata for that response.
 */
export function getPagedResult(
  program: Program,
  entity: Model | Operation,
): PagedResultMetadata | undefined {
  let metadata: PagedResultMetadata | undefined = undefined;
  switch (entity.kind) {
    case "Model":
      if (program.stateMap(AzureCoreStateKeys.pagedResult).get(entity)) {
        metadata = { modelType: entity };
        const items = _getItems(program, entity);
        if (items !== undefined) {
          metadata.itemsProperty = items.property;
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          metadata.itemsPath = items.path;
          metadata.itemsSegments = items.segments;
        }
        const nextLink = _getNextLink(program, entity);
        if (nextLink !== undefined) {
          metadata.nextLinkProperty = nextLink.property;
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          metadata.nextLinkPath = nextLink.path;
          metadata.nextLinkSegments = nextLink.segments;
        }
        return metadata;
      } else if (entity.templateMapper) {
        for (const arg of entity.templateMapper.args) {
          metadata = getPagedResult(program, arg as Model);
          if (metadata !== undefined) {
            break;
          }
        }
        break;
      } else if (entity.name === "") {
        // for anonymous models, get the effective type of the properties to see if any are paged
        // if they are, then the anonymous model is probably paged too
        for (const property of entity.properties.values()) {
          const sources = getNamedSourceModels(property);
          if (sources) {
            for (const source of sources) {
              const sourceMetadata = getPagedResult(program, source);
              if (sourceMetadata) {
                return sourceMetadata;
              }
            }
          }
        }
      }
      if (entity.baseModel) {
        const parentMetadata = getPagedResult(program, entity.baseModel);
        if (parentMetadata) {
          parentMetadata.modelType = entity;
          return parentMetadata;
        }
      }
      break;
    case "Operation":
      switch (entity.returnType.kind) {
        case "Union":
          for (const variant of entity.returnType.variants.values()) {
            metadata = getPagedResult(program, variant.type as Model);
            if (metadata !== undefined) {
              break;
            }
          }
          break;
        case "Model":
          metadata = getPagedResult(program, entity.returnType as Model);
          break;
      }
      if (metadata !== undefined) {
        const nextLinkOperation = getOperationLink(program, entity, "nextPage");
        if (nextLinkOperation !== undefined) {
          metadata.nextLinkOperation = nextLinkOperation.linkedOperation;
        }
      }
  }
  return metadata;
}

export const $items: ItemsDecorator = (context: DecoratorContext, entity: ModelProperty) => {
  context.call($decorators.TypeSpec.pageItems, entity);
  context.program.stateMap(AzureCoreStateKeys.items).set(entity, true);
};

/**
 * Returns `true` if the property is marked with `@items`.
 */
export function getItems(program: Program, entity: Type): boolean | undefined {
  return program.stateMap(AzureCoreStateKeys.items).get(entity);
}

/**
 * Returns `true` if the property is marked with `@nextLink`.
 */
export function getNextLink(program: Program, entity: ModelProperty): boolean | undefined {
  return program.stateSet(Symbol.for(`TypeSpec.nextLink`)).has(entity);
}

export const $nextPageOperation: NextPageOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => {
  context.call($operationLink, entity, linkedOperation, "nextPage", parameters);
};

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
