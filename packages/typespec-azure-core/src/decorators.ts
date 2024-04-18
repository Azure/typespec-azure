import { createDiagnostic, createStateSymbol, reportDiagnostic } from "./lib.js";
import { getAllProperties } from "./utils.js";

import {
  createDiagnosticCollector,
  DecoratorContext,
  Diagnostic,
  DiagnosticCollector,
  Enum,
  EnumMember,
  getKnownValues,
  getNamespaceFullName,
  getTypeName,
  ignoreDiagnostics,
  IntrinsicType,
  isKey,
  isNeverType,
  isStringType,
  isTemplateDeclarationOrInstance,
  isVoidType,
  Model,
  ModelProperty,
  Operation,
  Program,
  Scalar,
  setTypeSpecNamespace,
  StringLiteral,
  Type,
  typespecTypeToJson,
  Union,
  UnionVariant,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { getHttpOperation, getRoutePath } from "@typespec/http";
import { getResourceTypeKey, getSegment, isAutoRoute } from "@typespec/rest";
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

// @fixed

const fixedKey = createStateSymbol("fixed");

export function $fixed(context: DecoratorContext, target: Enum) {
  context.program.stateMap(fixedKey).set(target, true);
}

export function isFixed(program: Program, target: Enum): boolean {
  return program.stateMap(fixedKey).get(target) !== undefined;
}

// pagedResult

const pagedResultsKey = createStateSymbol("pagedResult");

export function $pagedResult(context: DecoratorContext, entity: Model) {
  context.program.stateMap(pagedResultsKey).set(entity, true);
}

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
  current: string[] = []
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
  return findPathToProperty(program, entity, (prop) => getNextLink(program, prop) !== undefined);
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
  entity: Model | Operation
): PagedResultMetadata | undefined {
  let metadata: PagedResultMetadata | undefined = undefined;
  switch (entity.kind) {
    case "Model":
      if (program.stateMap(pagedResultsKey).get(entity)) {
        metadata = { modelType: entity };
        const items = _getItems(program, entity);
        if (items !== undefined) {
          metadata.itemsProperty = items.property;
          // eslint-disable-next-line deprecation/deprecation
          metadata.itemsPath = items.path;
          metadata.itemsSegments = items.segments;
        }
        const nextLink = _getNextLink(program, entity);
        if (nextLink !== undefined) {
          metadata.nextLinkProperty = nextLink.property;
          // eslint-disable-next-line deprecation/deprecation
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

const itemsPropertyKey = createStateSymbol("items");

export function $items(context: DecoratorContext, entity: ModelProperty) {
  context.program.stateMap(itemsPropertyKey).set(entity, true);
}

/**
 * Returns `true` if the property is marked with `@items`.
 */
export function getItems(program: Program, entity: Type): boolean | undefined {
  return program.stateMap(itemsPropertyKey).get(entity);
}

const nextLinkPropertyKey = createStateSymbol("nextLink");

export function $nextLink(context: DecoratorContext, entity: ModelProperty) {
  context.program.stateMap(nextLinkPropertyKey).set(entity, true);
}

/**
 * Returns `true` if the property is marked with `@nextLink`.
 */
export function getNextLink(program: Program, entity: Type): boolean | undefined {
  return program.stateMap(nextLinkPropertyKey).get(entity);
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

const lroStatusKey = createStateSymbol("lroStatus");

export function $lroStatus(context: DecoratorContext, entity: Enum | Union | ModelProperty) {
  const [states, diagnostics] = extractLroStates(context.program, entity);
  if (diagnostics.length > 0) context.program.reportDiagnostics(diagnostics);
  context.program.stateMap(lroStatusKey).set(entity, states);
}

// Internal use only
type PartialLongRunningStates = Partial<LongRunningStates> &
  Pick<LongRunningStates, "states"> &
  Pick<LongRunningStates, "succeededState"> &
  Pick<LongRunningStates, "failedState"> &
  Pick<LongRunningStates, "canceledState">;

function storeLroState(
  program: Program,
  states: PartialLongRunningStates,
  name: string,
  member?: EnumMember | UnionVariant
) {
  const expectedStates: [
    string,
    (program: Program, entity: EnumMember | UnionVariant) => boolean,
    () => void,
  ][] = [
    ["Succeeded", isLroSucceededState, () => states.succeededState.push(name)],
    ["Failed", isLroFailedState, () => states.failedState.push(name)],
    ["Canceled", isLroCanceledState, () => states.canceledState.push(name)],
  ];

  states.states.push(name);
  for (const [knownState, stateTest, setter] of expectedStates) {
    if (name === knownState || (member && stateTest(program, member))) {
      setter();
      break;
    }
  }
}

function extractLroStatesFromUnion(
  program: Program,
  entity: Type,
  lroStateResult: PartialLongRunningStates,
  diagnostics: DiagnosticCollector
) {
  if (entity.kind === "Union") {
    for (const variant of entity.variants.values()) {
      const option = variant.type;
      if (option.kind === "Enum") {
        for (const member of option.members.values()) {
          storeLroState(program, lroStateResult, member.name, member);
        }
      } else if (option.kind === "Union") {
        extractLroStatesFromUnion(program, option, lroStateResult, diagnostics);
      } else if (option.kind === "Scalar" && option.name === "string") {
        // Ignore string marking this union as open.
        continue;
      } else if (option.kind !== "String") {
        diagnostics.add(
          createDiagnostic({
            code: "lro-status-union-non-string",
            target: option,
            format: {
              type: option.kind,
            },
          })
        );

        return diagnostics.wrap(undefined);
      } else {
        storeLroState(
          program,
          lroStateResult,
          typeof variant.name === "string" ? variant.name : option.value,
          variant
        );
      }
    }
  }
  return;
}

export function extractLroStates(
  program: Program,
  entity: Type
): [LongRunningStates | undefined, readonly Diagnostic[]] {
  const result: PartialLongRunningStates = {
    states: [],
    succeededState: [],
    failedState: [],
    canceledState: [],
  };
  const diagnostics = createDiagnosticCollector();
  if (entity.kind === "ModelProperty") {
    // Call the function recursively on the property type
    return extractLroStates(program, entity.type);
  } else if (entity.kind === "Enum") {
    for (const member of entity.members.values()) {
      storeLroState(program, result, member.name, member);
    }
  } else if (entity.kind === "Union") {
    extractLroStatesFromUnion(program, entity, result, diagnostics);
  } else {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-property-invalid-type",
        target: entity,
        format: {
          type: entity.kind,
        },
      })
    );

    return diagnostics.wrap(undefined);
  }

  // Make sure all terminal states have been identified
  const missingStates: string[] = [];
  if (result.succeededState.length < 1) {
    missingStates.push("Succeeded");
  }
  if (result.failedState.length < 1) {
    missingStates.push("Failed");
  }

  if (missingStates.length > 0) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-missing",
        target: entity,
        format: {
          states: missingStates.join(", "),
        },
      })
    );

    return diagnostics.wrap(undefined);
  }

  return diagnostics.wrap(result as LongRunningStates);
}

/**
 *  Returns the `LongRunningStates` associated with `entity`.
 */
export function getLongRunningStates(
  program: Program,
  entity: Enum | Model | Scalar | ModelProperty
): LongRunningStates | undefined {
  // Is the type a string with known values?
  if (isStringType(program, entity)) {
    // Check the known values enum for LRO states
    const knownValues = getKnownValues(program, entity as Scalar);
    return knownValues ? getLongRunningStates(program, knownValues) : undefined;
  }

  // Otherwise just check the type itself
  return program.stateMap(lroStatusKey).get(entity);
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
    let values = program.stateMap(lroStatusKey).get(prop);
    if (values !== undefined) return prop;
    if (prop.type.kind === "Enum" || prop.type.kind === "Union") {
      values = program.stateMap(lroStatusKey).get(prop.type);
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

//@lroResult

const lroResultKey = createStateSymbol("lroResult");

/**
 * Marks the property in a StatusMonitor that contains the logical result
 * of a successful operation.
 * @param context The decorator execution context.
 * @param entity The model property that contains the logical result.
 */
export function $lroResult(context: DecoratorContext, entity: ModelProperty) {
  const { program } = context;
  program.stateMap(lroResultKey).set(entity, entity);
}

/**
 * Gets the logical result property from a StatusMonitor
 * @param program The program to process.
 * @param entity The StatusMonitor model to process.
 * @param useDefault Use the default result property if no other
 * property is marked. (defaults to true)
 */
export function getLroResult(
  program: Program,
  entity: Model,
  useDefault: boolean = true
): [ModelProperty | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let count = 0;
  let resultProperty: ModelProperty | undefined = undefined;
  let defaultProperty: ModelProperty | undefined = undefined;
  for (const prop of walkPropertiesInherited(entity)) {
    const candidateProperty = program.stateMap(lroResultKey).get(prop);
    if (candidateProperty !== undefined) {
      resultProperty = candidateProperty;
      count++;
    }

    if (prop.name.toLowerCase() === "result") defaultProperty = prop;
  }

  if (count > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-monitor-invalid-result-property",
        target: entity,
        format: { resultType: "result", decorator: "@lroResult" },
      })
    );
  }

  if (resultProperty === undefined && useDefault) resultProperty = defaultProperty;
  if (resultProperty && isNeverType(resultProperty.type)) resultProperty = undefined;
  return diagnostics.wrap(resultProperty);
}

//@lroErrorResult

const lroErrorResultKey = createStateSymbol("lroErrorResult");

/**
 * Marks the property in a StatusMonitor that contains the error result
 * of a failed operation.
 * @param context The decorator execution context.
 * @param entity The model property that contains the error result.
 */
export function $lroErrorResult(context: DecoratorContext, entity: ModelProperty) {
  const { program } = context;
  program.stateMap(lroErrorResultKey).set(entity, entity);
}

/**
 * Gets the error result property from a StatusMonitor
 * @param program The program to process.
 * @param entity The StatusMonitor model to process.
 * @param useDefault Use the default error property if no other
 * property is marked. (defaults to true)
 */
export function getLroErrorResult(
  program: Program,
  entity: Model,
  useDefault: boolean = true
): [ModelProperty | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let count = 0;
  let resultProperty: ModelProperty | undefined = undefined;
  let defaultProperty: ModelProperty | undefined = undefined;
  for (const prop of walkPropertiesInherited(entity)) {
    const candidateProperty = program.stateMap(lroErrorResultKey).get(prop);
    if (candidateProperty !== undefined) {
      resultProperty = candidateProperty;
      count++;
    }

    if (prop.name.toLowerCase() === "error") defaultProperty = prop;
  }

  if (count > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-status-monitor-invalid-result-property",
        target: entity,
        format: { resultType: "error", decorator: "@lroErrorResult" },
      })
    );
  }

  if (resultProperty === undefined && useDefault) resultProperty = defaultProperty;
  return diagnostics.wrap(resultProperty);
}

//@pollingOperationParameter

const pollingParameterKey = createStateSymbol("pollingOperationParameter");
export function $pollingOperationParameter(
  context: DecoratorContext,
  entity: ModelProperty,
  target?: ModelProperty | StringLiteral
) {
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
  program.stateMap(pollingParameterKey).set(entity, storedValue ?? entity.name);
}

export function getPollingOperationParameter(
  program: Program,
  entity: ModelProperty
): string | ModelProperty | undefined {
  return program.stateMap(pollingParameterKey).get(entity);
}

// @lroSucceeded

const lroSucceededKey = createStateSymbol("lroSucceeded");

export function $lroSucceeded(context: DecoratorContext, entity: EnumMember | UnionVariant) {
  context.program.stateSet(lroSucceededKey).add(entity);
}

/**
 *  Returns `true` if the enum member represents a "succeeded" state.
 */
export function isLroSucceededState(program: Program, entity: EnumMember | UnionVariant) {
  return program.stateSet(lroSucceededKey).has(entity);
}

// @lroCanceled

const lroCanceledKey = createStateSymbol("lroCanceled");

export function $lroCanceled(context: DecoratorContext, entity: EnumMember | UnionVariant) {
  context.program.stateSet(lroCanceledKey).add(entity);
}

/**
 *  Returns `true` if the enum member represents a "canceled" state.
 */
export function isLroCanceledState(program: Program, entity: EnumMember | UnionVariant) {
  return program.stateSet(lroCanceledKey).has(entity);
}

// @lroFailed

const lroFailedKey = createStateSymbol("lroFailed");

export function $lroFailed(context: DecoratorContext, entity: EnumMember | UnionVariant) {
  context.program.stateSet(lroFailedKey).add(entity);
}

/**
 *  Returns `true` if the enum member represents a "failed" state.
 */
export function isLroFailedState(program: Program, entity: EnumMember | UnionVariant): boolean {
  return program.stateSet(lroFailedKey).has(entity);
}

// @pollingLocation

const pollingLocationsKey = createStateSymbol("pollingLocations");
const pollingLocationInfoKey = createStateSymbol("pollingLocationInfo");

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
export function $pollingLocation(
  context: DecoratorContext,
  entity: ModelProperty,
  options?: Model
) {
  const { program } = context;
  if (options) {
    if (isNeverType(options)) return;
    const info = extractPollingLocationInfo(program, entity, options);
    if (info) {
      program.stateMap(pollingLocationInfoKey).set(entity, info);
    }
  }

  program.stateSet(pollingLocationsKey).add(entity);
}

/**
 * Gets polling information stored with a field that contains a link to an Lro polling endpoint
 * @param program The program to check
 * @param target The ModelProperty to check for polling info
 */
export function getPollingLocationInfo(
  program: Program,
  target: ModelProperty
): PollingLocationInfo | undefined {
  return program.stateMap(pollingLocationInfoKey).get(target);
}

function extractUnionVariantValue(type: Type): string | undefined {
  if (type.kind === "UnionVariant" && type.type.kind === "String") return type.type.value;
  return undefined;
}

function extractPollingLocationInfo(
  program: Program,
  target: ModelProperty,
  options: Model
): PollingLocationInfo | undefined {
  const kind = options.properties.get(optionsKindKey);
  if (kind === undefined) return undefined;
  const kindValue: string | undefined = extractUnionVariantValue(kind.type);
  if (kindValue === undefined) return undefined;
  const pollingInfo: {
    pollingModel?: Model | IntrinsicType;
    finalResult?: Model | IntrinsicType;
    target: ModelProperty;
  } = { target: target };
  const pollingModel = options.properties.get(pollingModelKey)?.type;
  if (pollingModel && pollingModel.kind === "Model") pollingInfo.pollingModel = pollingModel;
  if (pollingModel && isVoidType(pollingModel)) pollingInfo.pollingModel = program.checker.voidType;
  const finalResult = options.properties.get(finalResultKey)?.type;
  if (finalResult && finalResult.kind === "Model") pollingInfo.finalResult = finalResult;
  if (finalResult && isVoidType(finalResult)) pollingInfo.finalResult = program.checker.voidType;
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
  }
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
    extractStatusMonitorInfo(program, baseInfo.pollingModel, statusProperty)
  );
  if (statusMonitor === undefined) return undefined;
  statusMonitor.successProperty = finalPropertyValue;
  baseInfo.finalResult =
    finalPropertyValue?.type?.kind === "Model" ? finalPropertyValue.type : program.checker.voidType;
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
  return program.stateSet(pollingLocationsKey).has(entity);
}

// @finalLocation

const finalLocationsKey = createStateSymbol("finalLocations");
const finalLocationResultsKey = createStateSymbol("finalLocationResults");

export function $finalLocation(
  context: DecoratorContext,
  entity: ModelProperty,
  finalResult?: Model | IntrinsicType
) {
  const { program } = context;
  if (finalResult !== undefined && isNeverType(finalResult)) return;
  program.stateSet(finalLocationsKey).add(entity);
  switch (finalResult?.kind) {
    case "Model":
      program.stateMap(finalLocationResultsKey).set(entity, finalResult);
      break;
    case "Intrinsic":
      if (isVoidType(finalResult)) {
        program.stateMap(finalLocationResultsKey).set(entity, finalResult);
      }
  }
}

/**
 *  Returns `true` if the property is marked with @finalLocation.
 */
export function isFinalLocation(program: Program, entity: ModelProperty): boolean {
  return program.stateSet(finalLocationsKey).has(entity);
}

export function getFinalLocationValue(
  program: Program,
  entity: ModelProperty
): Model | IntrinsicType | undefined {
  return program.stateMap(finalLocationResultsKey).get(entity);
}

export function $omitKeyProperties(context: DecoratorContext, entity: Model) {
  // Delete any key properties from the model
  for (const [key, prop] of entity.properties) {
    if (isKey(context.program, prop)) {
      entity.properties.delete(key);
    }
  }
}

export interface OperationLinkMetadata {
  parameters?: Type;
  linkedOperation: Operation;
  linkType: string;

  link?: OperationLink;
  parameterMap?: Map<string, PropertyMap>;
  result?: ResultInfo;
}

const operationLinkKey = createStateSymbol("operationLink");

export function $operationLink(
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  linkType: string,
  parameters?: Model
) {
  const { program } = context;
  const [operationInfo, diagnostics] = getLroOperationInfo(
    program,
    entity,
    linkedOperation,
    parameters
  );
  if (diagnostics.length > 0) {
    program.reportDiagnostics(diagnostics);
  }

  // An operation may have many operationLinks, so treat them as a collection
  let items = context.program.stateMap(operationLinkKey).get(entity) as Map<
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
  context.program.stateMap(operationLinkKey).set(entity, items);
}

/**
 * Returns the `OperationLinkMetadata` for a given operation and link type, or undefined.
 */
export function getOperationLink(
  program: Program,
  entity: Operation,
  linkType: string
): OperationLinkMetadata | undefined {
  const items = program.stateMap(operationLinkKey).get(entity) as Map<
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
  entity: Operation
): Map<string, OperationLinkMetadata> | undefined {
  return program.stateMap(operationLinkKey).get(entity) as Map<string, OperationLinkMetadata>;
}

export function $pollingOperation(
  context: DecoratorContext,
  target: Operation,
  linkedOperation: Operation,
  parameters?: Model
) {
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
}

export function $finalOperation(
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Model
) {
  const { program } = context;
  context.call($operationLink, entity, linkedOperation, FinalOperationKey, parameters);

  const operationDetails = getOperationLink(program, entity, FinalOperationKey);
  if (operationDetails === undefined || operationDetails.result === undefined) {
    reportDiagnostic(context.program, {
      code: "invalid-final-operation",
      target: entity,
    });
  }
}

export function $nextPageOperation(
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Model
) {
  context.call($operationLink, entity, linkedOperation, "nextPage", parameters);
}

const requestParameterKey = createStateSymbol("requestParameter");

export function $requestParameter(context: DecoratorContext, entity: Model, name: string) {
  context.program.stateMap(requestParameterKey).set(entity, name);
}

export function getRequestParameter(program: Program, entity: ModelProperty): string | undefined {
  if (entity.type.kind !== "Model") return undefined;
  const parameterName: string | undefined = program.stateMap(requestParameterKey).get(entity.type);
  return parameterName;
}

const responsePropertyKey = createStateSymbol("responseParameter");

export function $responseProperty(context: DecoratorContext, entity: Model, name: string) {
  context.program.stateMap(responsePropertyKey).set(entity, name);
}

export function getResponseProperty(program: Program, entity: ModelProperty): string | undefined {
  if (entity.type.kind !== "Model") return undefined;
  const parameterName: string | undefined = program.stateMap(responsePropertyKey).get(entity.type);
  return parameterName;
}

export function $spreadCustomParameters(
  context: DecoratorContext,
  entity: Model,
  customizations: Model
) {
  const customParameters: Type | undefined = customizations.properties.get("parameters")?.type;
  if (customParameters) {
    if (customParameters.kind !== "Model") {
      // The constraint checker will have complained about this already.
      return;
    }

    // Copy all parameters into this model type
    // TODO: This needs to use the equivalent of Checker.checkSpreadProperty
    // once a helper method is available
    for (const [key, value] of customParameters.properties) {
      entity.properties.set(
        key,
        context.program.checker.cloneType(value, {
          sourceProperty: value,
          model: entity,
        })
      );
    }
  }
}

export function $spreadCustomResponseProperties(
  context: DecoratorContext,
  entity: Model,
  customizations: Model
) {
  const customResponseProperties: Type | undefined =
    customizations.properties.get("response")?.type;
  if (customResponseProperties) {
    if (customResponseProperties.kind !== "Model") {
      // The constraint checker will have complained about this already.
      return;
    }

    // Copy all parameters into this model type
    // TODO: This needs to use the equivalent of Checker.checkSpreadProperty
    // once a helper method is available
    for (const [key, value] of customResponseProperties.properties) {
      entity.properties.set(
        key,
        context.program.checker.cloneType(value, {
          sourceProperty: value,
          model: entity,
        })
      );
    }
  }
}

const resourceOperationKey = createStateSymbol("resourceOperation");

export function $ensureResourceType(
  context: DecoratorContext,
  entity: Operation,
  resourceType: Type
) {
  if (resourceType.kind === "TemplateParameter") {
    return;
  }

  // Mark the operation as a resource operation
  context.program.stateSet(resourceOperationKey).add(entity);

  if (resourceType.kind !== "Model") {
    context.program.reportDiagnostic({
      code: "invalid-argument",
      message: `This operation expects a Model for its TResource parameter.`,
      severity: "error",
      target: entity,
    });

    return;
  }

  // If the operation is defined under Azure.Core, ignore these diagnostics.
  // We're only concerned with user-defined operations.
  if (entity.namespace && getNamespaceFullName(entity.namespace).startsWith("Azure.Core")) {
    return;
  }

  const key = getResourceTypeKey(context.program, resourceType);
  if (!key) {
    reportDiagnostic(context.program, {
      code: "invalid-resource-type",
      target: entity,
      messageId: "missingKey",
      format: {
        name: getTypeName(resourceType),
      },
    });

    return;
  }

  if (!getSegment(context.program, key.keyProperty)) {
    reportDiagnostic(context.program, {
      code: "invalid-resource-type",
      target: entity,
      messageId: "missingSegment",
      format: {
        name: getTypeName(resourceType),
      },
    });
  }
}

export function isResourceOperation(program: Program, operation: Operation): boolean {
  return program.stateSet(resourceOperationKey).has(operation);
}

const needsRouteKey = createStateSymbol("needsRoute");

export function $needsRoute(context: DecoratorContext, entity: Operation) {
  // If the operation is not templated, add it to the list of operations to
  // check later
  if (entity.node.templateParameters.length === 0) {
    context.program.stateSet(needsRouteKey).add(entity);
  }
}

export function checkRpcRoutes(program: Program) {
  (program.stateSet(needsRouteKey) as Set<Operation>).forEach((op: Operation) => {
    if (
      op.node.templateParameters.length === 0 &&
      !isAutoRoute(program, op) &&
      !getRoutePath(program, op)
    ) {
      reportDiagnostic(program, {
        code: "rpc-operation-needs-route",
        target: op,
      });
    }
  });
}

const ensureVerbKey = createStateSymbol("ensureVerb");

export function $ensureVerb(
  context: DecoratorContext,
  entity: Operation,
  templateName: string,
  verb: string
) {
  context.program.stateMap(ensureVerbKey).set(entity, [templateName, verb]);
}

export function checkEnsureVerb(program: Program) {
  const opMap = program.stateMap(ensureVerbKey) as Map<Operation, string>;
  for (const [operation, [templateName, requiredVerb]] of opMap.entries()) {
    if (isTemplateDeclarationOrInstance(operation)) continue;
    const verb = getHttpOperation(program, operation)[0].verb.toString().toLowerCase();
    const reqVerb: string = requiredVerb.toLowerCase();
    if (verb !== reqVerb) {
      reportDiagnostic(program, {
        code: "verb-conflict",
        target: operation,
        format: {
          templateName: templateName,
          verb: verb.toUpperCase(),
          requiredVerb: reqVerb.toUpperCase(),
        },
      });
    }
  }
}

const embeddingVectorKey = createStateSymbol("embeddingVector");

export interface EmbeddingVectorMetadata {
  elementType: Type;
}

/** @internal */
export function $embeddingVector(context: DecoratorContext, entity: Model, elementType: Type) {
  const metadata: EmbeddingVectorMetadata = {
    elementType: elementType,
  };
  context.program.stateMap(embeddingVectorKey).set(entity, metadata);
}

/**
 * If the provided model is an embedding vector, returns the appropriate metadata; otherwise,
 * returns undefined.
 * @param model the model to query
 * @returns `EmbeddingVectorMetadata`, if applicable, or undefined.
 */
export function getAsEmbeddingVector(
  program: Program,
  model: Model
): EmbeddingVectorMetadata | undefined {
  return program.stateMap(embeddingVectorKey).get(model);
}

const armResourceIdentifierConfigKey = createStateSymbol("armResourceIdentifierConfig");

export interface ArmResourceIdentifierConfig {
  readonly allowedResources: readonly ArmResourceIdentifierAllowedResource[];
}

export type ArmResourceDeploymentScope =
  | "Tenant"
  | "Subscription"
  | "ResourceGroup"
  | "ManagementGroup"
  | "Extension";

export interface ArmResourceIdentifierAllowedResource {
  /** The type of resource that is being referred to. For example Microsoft.Network/virtualNetworks or Microsoft.Network/virtualNetworks/subnets. See Example Types for more examples. */
  readonly type: string;

  /**
   * An array of scopes. If not specified, the default scope is ["ResourceGroup"].
   * See [Allowed Scopes](https://github.com/Azure/autorest/tree/main/docs/extensions#allowed-scopes).
   */
  readonly scopes?: ArmResourceDeploymentScope[];
}

/** @internal */
export function $armResourceIdentifierConfig(
  context: DecoratorContext,
  entity: Scalar,
  config: Type
) {
  if (config.kind !== "Model") return;
  const prop = config.properties.get("allowedResources");
  if (prop === undefined || prop.type.kind !== "Tuple") return;
  const [data, diagnostics] = typespecTypeToJson<ArmResourceIdentifierConfig>(
    prop.type,
    context.getArgumentTarget(0)!
  );
  context.program.reportDiagnostics(diagnostics);

  if (data) {
    context.program
      .stateMap(armResourceIdentifierConfigKey)
      .set(entity, { allowedResources: data });
  }
}

/** Returns the config attached to an armResourceIdentifierScalar */
export function getArmResourceIdentifierConfig(
  program: Program,
  entity: Scalar
): ArmResourceIdentifierConfig {
  return program.stateMap(armResourceIdentifierConfigKey).get(entity);
}

setTypeSpecNamespace("Foundations", $omitKeyProperties, $requestParameter, $responseProperty);
setTypeSpecNamespace(
  "Foundations.Private",
  $spreadCustomResponseProperties,
  $spreadCustomParameters,
  $ensureResourceType,
  $needsRoute,
  $ensureVerb,
  $embeddingVector,
  $armResourceIdentifierConfig
);
