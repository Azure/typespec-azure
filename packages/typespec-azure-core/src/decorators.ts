import { AzureCoreStateKeys, reportDiagnostic } from "./lib.js";

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
  FinalOperationDecorator,
  ItemsDecorator,
  NextPageOperationDecorator,
  OperationLinkDecorator,
  PagedResultDecorator,
  PollingOperationDecorator,
} from "../generated-defs/Azure.Core.js";
import { OperationLink } from "./lro-helpers.js";
import { getLroOperationInfo, PropertyMap, ResultInfo } from "./lro-info.js";

/*
 * Constants for polling and final operation links
 */

export const PollingOperationKey: string = "polling";
export const FinalOperationKey = "final";

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

export interface OperationLinkMetadata {
  parameters?: Type;
  linkedOperation: Operation;
  linkType: string;

  link?: OperationLink;
  parameterMap?: Map<string, PropertyMap>;
  result?: ResultInfo;
}

export const $operationLink: OperationLinkDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  linkType: string,
  parameters?: Type,
) => {
  if (parameters && parameters.kind !== "Model") {
    return;
  }
  const { program } = context;
  const [operationInfo, diagnostics] = getLroOperationInfo(
    program,
    entity,
    linkedOperation,
    linkType,
    parameters,
  );
  if (diagnostics.length > 0) {
    program.reportDiagnostics(diagnostics);
  }

  // An operation may have many operationLinks, so treat them as a collection
  let items = context.program.stateMap(AzureCoreStateKeys.operationLink).get(entity) as Map<
    string,
    OperationLinkMetadata
  >;
  if (items === undefined) {
    items = new Map<string, OperationLinkMetadata>();
  }
  items.set(linkType, {
    parameters: parameters,
    linkedOperation: linkedOperation,
    linkType: linkType,
    link: operationInfo?.getOperationLink(),
    parameterMap: operationInfo?.getInvocationInfo()?.parameterMap,
    result: operationInfo?.getResultInfo(),
  } as OperationLinkMetadata);
  context.program.stateMap(AzureCoreStateKeys.operationLink).set(entity, items);
};

/**
 * Returns the `OperationLinkMetadata` for a given operation and link type, or undefined.
 */
export function getOperationLink(
  program: Program,
  entity: Operation,
  linkType: string,
): OperationLinkMetadata | undefined {
  const items = program.stateMap(AzureCoreStateKeys.operationLink).get(entity) as Map<
    string,
    OperationLinkMetadata
  >;
  if (items !== undefined) {
    return items.get(linkType);
  }
  return items;
}

/**
 * Returns the collection of `OperationLinkMetadata` for a given operation, if any, or undefined.
 */
export function getOperationLinks(
  program: Program,
  entity: Operation,
): Map<string, OperationLinkMetadata> | undefined {
  return program.stateMap(AzureCoreStateKeys.operationLink).get(entity) as Map<
    string,
    OperationLinkMetadata
  >;
}

export const $pollingOperation: PollingOperationDecorator = (
  context: DecoratorContext,
  target: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => {
  const { program } = context;
  const isValidReturnType =
    target.returnType.kind === "Model" ||
    (target.returnType.kind === "Union" &&
      [...target.returnType.variants.values()].every((x) => x.type.kind === "Model"));
  if (!isValidReturnType) {
    reportDiagnostic(context.program, {
      code: "polling-operation-return-model",
      target: target,
    });
    return;
  }
  context.call($operationLink, target, linkedOperation, PollingOperationKey, parameters);

  const operationDetails = getOperationLink(program, target, PollingOperationKey);
  if (operationDetails === undefined || operationDetails.result === undefined) {
    reportDiagnostic(context.program, {
      code: "polling-operation-return-model",
      target: target,
    });
    return;
  }

  if (operationDetails.result.statusMonitor === undefined) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-status-monitor",
      target: linkedOperation,
    });
    return;
  }

  if (operationDetails.result.statusMonitor.terminationInfo.succeededState.length < 1) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-lro-success",
      target: operationDetails.result.statusMonitor.monitorType,
    });
  }

  if (operationDetails.result.statusMonitor.terminationInfo.failedState.length < 1) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-lro-failure",
      target: operationDetails.result.statusMonitor.monitorType,
    });
  }

  if (operationDetails.parameterMap === undefined && operationDetails.link === undefined) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-ref-or-link",
      target: target,
    });
  }
};

export const $finalOperation: FinalOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => {
  const { program } = context;
  context.call($operationLink, entity, linkedOperation, FinalOperationKey, parameters);

  const operationDetails = getOperationLink(program, entity, FinalOperationKey);
  if (operationDetails === undefined || operationDetails.result === undefined) {
    reportDiagnostic(context.program, {
      code: "invalid-final-operation",
      target: entity,
    });
  }
};

export const $nextPageOperation: NextPageOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => {
  context.call($operationLink, entity, linkedOperation, "nextPage", parameters);
};

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
