import { AzureCoreStateKeys, reportDiagnostic } from "./lib.js";
import { getAllProperties } from "./utils.js";

import {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  $decorators,
  DecoratorContext,
  ignoreDiagnostics,
  IntrinsicType,
  isKey,
  isNeverType,
  isVoidType,
  Model,
  ModelProperty,
  Operation,
  Program,
  Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { OmitKeyPropertiesDecorator } from "../generated-defs/Azure.Core.Foundations.js";
import {
  FinalLocationDecorator,
  FinalOperationDecorator,
  ItemsDecorator,
  NextPageOperationDecorator,
  OperationLinkDecorator,
  PagedResultDecorator,
  PollingLocationDecorator,
  PollingOperationDecorator,
  PollingOperationParameterDecorator,
} from "../generated-defs/Azure.Core.js";
import { getLroResult } from "./decorators/lro-result.js";
import { extractLroStates } from "./decorators/lro-status.js";
import { OperationLink } from "./lro-helpers.js";
import {
  extractStatusMonitorInfo,
  getLroOperationInfo,
  PropertyMap,
  ResultInfo,
  StatusMonitorMetadata,
} from "./lro-info.js";

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

/**
 *  Provides the names of terminal long-running operation states plus any
 *  additional states defined for the operation.
 **/
export interface LongRunningStates {
  // The string which represents the "Succeeded" state.
  succeededState: string[];

  // The string which represents the "Failed" state.
  failedState: string[];

  // The string which represents the "Canceled" state.
  canceledState: string[];

  // The full array of long-running operation states.
  states: string[];
}

/**
 * Return the property that contains the lro status
 * @param program The program to process
 * @param target The model to check for lro status
 */
export function getLroStatusProperty(program: Program, target: Model): ModelProperty | undefined {
  function getProvisioningState(props: Map<string, ModelProperty>): ModelProperty | undefined {
    let innerProps: Map<string, ModelProperty> | undefined = undefined;
    let result: ModelProperty | undefined = undefined;
    const innerProperty = props.get("properties");
    result = props.get("provisioningState");
    if (
      result === undefined &&
      innerProperty !== undefined &&
      innerProperty.type?.kind === "Model"
    ) {
      innerProps = getAllProperties(innerProperty.type);
      result = innerProps.get("provisioningState");
    }

    return result;
  }
  const props = getAllProperties(target);
  for (const [_, prop] of props.entries()) {
    let values = program.stateMap(AzureCoreStateKeys.lroStatus).get(prop);
    if (values !== undefined) return prop;
    if (prop.type.kind === "Enum" || prop.type.kind === "Union") {
      values = program.stateMap(AzureCoreStateKeys.lroStatus).get(prop.type);
      if (values !== undefined) return prop;
    }
  }

  const statusProp = props.get("status") ?? getProvisioningState(props);
  if (statusProp) {
    const [states, _] = extractLroStates(program, statusProp);
    if (states !== undefined) return statusProp;
  }

  return undefined;
}

//@pollingOperationParameter

export const $pollingOperationParameter: PollingOperationParameterDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  target?: Type,
) => {
  const { program } = context;
  let storedValue: ModelProperty | string | undefined;
  switch (target?.kind) {
    case "ModelProperty":
      storedValue = target;
      break;
    case "String":
      storedValue = target.value;
      break;
    default:
      storedValue = undefined;
  }
  program
    .stateMap(AzureCoreStateKeys.pollingOperationParameter)
    .set(entity, storedValue ?? entity.name);
};

export function getPollingOperationParameter(
  program: Program,
  entity: ModelProperty,
): string | ModelProperty | undefined {
  return program.stateMap(AzureCoreStateKeys.pollingOperationParameter).get(entity);
}

// @pollingLocation

/** Extra information about polling control stored with a polling link */
export type PollingLocationInfo = StatusMonitorPollingLocationInfo;

/** The abstract type for polling control information */
export interface PollingLocationBase {
  /** The kind of polling being done */
  kind: pollingOptionsKind;
  /** The model property containing the polling link */
  target: ModelProperty;
  /** The type of the poller */
  pollingModel?: Model | IntrinsicType;
  /** The type of the final result after polling completes */
  finalResult?: Model | IntrinsicType;
}

/** Collected data for status monitor polling links */
export interface StatusMonitorPollingLocationInfo extends PollingLocationBase {
  /** The kind of status monitor */
  kind: pollingOptionsKind.StatusMonitor;
  /** The status monitor detailed data for control of polling. */
  info: StatusMonitorMetadata;
}

// keys of the pollingOptions type
const optionsKindKey = "kind";
const finalPropertyKey = "finalProperty";
const pollingModelKey = "pollingModel";
const finalResultKey = "finalResult";

export enum pollingOptionsKind {
  StatusMonitor = "statusMonitor",
}
export const $pollingLocation: PollingLocationDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  options?: Type,
) => {
  const { program } = context;
  if (options) {
    if (isNeverType(options)) return;
    const info = extractPollingLocationInfo(program, entity, options);
    if (info) {
      program.stateMap(AzureCoreStateKeys.pollingLocationInfo).set(entity, info);
    }
  }

  program.stateSet(AzureCoreStateKeys.pollingOperationParameter).add(entity);
};

/**
 * Gets polling information stored with a field that contains a link to an Lro polling endpoint
 * @param program The program to check
 * @param target The ModelProperty to check for polling info
 */
export function getPollingLocationInfo(
  program: Program,
  target: ModelProperty,
): PollingLocationInfo | undefined {
  return program.stateMap(AzureCoreStateKeys.pollingLocationInfo).get(target);
}

function extractUnionVariantValue(type: Type): string | undefined {
  if (type.kind === "UnionVariant" && type.type.kind === "String") return type.type.value;
  return undefined;
}

function extractPollingLocationInfo(
  program: Program,
  target: ModelProperty,
  options: Type,
): PollingLocationInfo | undefined {
  if (options.kind !== "Model") return undefined;
  const kind = options.properties.get(optionsKindKey);
  if (kind === undefined) return undefined;
  const kindValue: string | undefined = extractUnionVariantValue(kind.type);
  if (kindValue === undefined) return undefined;
  const pollingInfo: {
    pollingModel?: Model | IntrinsicType;
    finalResult?: Model | IntrinsicType;
    target: ModelProperty;
    useForFinalState?: boolean;
  } = { target: target };
  const pollingModel = options.properties.get(pollingModelKey)?.type;
  if (pollingModel && pollingModel.kind === "Model") pollingInfo.pollingModel = pollingModel;
  if (pollingModel && isVoidType(pollingModel))
    pollingInfo.pollingModel = $(program).intrinsic.void;
  const finalResult = options.properties.get(finalResultKey)?.type;
  if (finalResult && finalResult.kind === "Model") pollingInfo.finalResult = finalResult;
  if (finalResult && isVoidType(finalResult)) pollingInfo.finalResult = $(program).intrinsic.void;
  switch (kindValue) {
    case pollingOptionsKind.StatusMonitor:
      return extractStatusMonitorLocationInfo(program, options, pollingInfo);
    default:
      return undefined;
  }
}

function extractStatusMonitorLocationInfo(
  program: Program,
  options: Model,
  baseInfo: {
    pollingModel?: Model | IntrinsicType;
    finalResult?: Model | IntrinsicType;
    target: ModelProperty;
    useForFInalState?: boolean;
  },
): StatusMonitorPollingLocationInfo | undefined {
  const kind = options.properties.get(optionsKindKey);
  if (kind === undefined || extractUnionVariantValue(kind.type) !== "statusMonitor")
    return undefined;
  if (baseInfo.pollingModel === undefined || baseInfo.pollingModel.kind === "Intrinsic")
    return undefined;
  const finalProperty = options.properties.get(finalPropertyKey)?.type;
  let finalPropertyValue: ModelProperty | undefined = undefined;
  if (finalProperty && finalProperty.kind === "ModelProperty") finalPropertyValue = finalProperty;
  if (
    finalProperty &&
    finalProperty.kind === "String" &&
    baseInfo.pollingModel.properties.has(finalProperty.value)
  ) {
    finalPropertyValue = baseInfo.pollingModel.properties.get(finalProperty.value);
  }
  if (finalPropertyValue === undefined)
    finalPropertyValue = ignoreDiagnostics(getLroResult(program, baseInfo.pollingModel, true));
  const statusProperty = getLroStatusProperty(program, baseInfo.pollingModel);
  if (statusProperty === undefined) return undefined;
  const statusMonitor = ignoreDiagnostics(
    extractStatusMonitorInfo(program, baseInfo.pollingModel, statusProperty),
  );
  if (statusMonitor === undefined) return undefined;
  statusMonitor.successProperty = finalPropertyValue;
  baseInfo.finalResult =
    finalPropertyValue?.type?.kind === "Model"
      ? finalPropertyValue.type
      : $(program).intrinsic.void;
  return {
    kind: pollingOptionsKind.StatusMonitor,
    info: statusMonitor,
    ...baseInfo,
  };
}

/**
 *  Returns `true` if the property is marked with @pollingLocation.
 */
export function isPollingLocation(program: Program, entity: ModelProperty): boolean {
  return program.stateSet(AzureCoreStateKeys.pollingOperationParameter).has(entity);
}

// @finalLocation

export const $finalLocation: FinalLocationDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  finalResult?: Type,
) => {
  const { program } = context;
  if (finalResult !== undefined && isNeverType(finalResult)) return;
  program.stateSet(AzureCoreStateKeys.finalLocations).add(entity);
  switch (finalResult?.kind) {
    case "Model":
      program.stateMap(AzureCoreStateKeys.finalLocationResults).set(entity, finalResult);
      break;
    case "Intrinsic":
      if (isVoidType(finalResult)) {
        program.stateMap(AzureCoreStateKeys.finalLocationResults).set(entity, finalResult);
      }
  }
};

/**
 *  Returns `true` if the property is marked with @finalLocation.
 */
export function isFinalLocation(program: Program, entity: ModelProperty): boolean {
  return program.stateSet(AzureCoreStateKeys.finalLocations).has(entity);
}

export function getFinalLocationValue(
  program: Program,
  entity: ModelProperty,
): Model | IntrinsicType | undefined {
  return program.stateMap(AzureCoreStateKeys.finalLocationResults).get(entity);
}

export const $omitKeyProperties: OmitKeyPropertiesDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  // Delete any key properties from the model
  for (const [key, prop] of entity.properties) {
    if (isKey(context.program, prop)) {
      entity.properties.delete(key);
    }
  }
};

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
