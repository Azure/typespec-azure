import "./index.js";
import {
  filterModelProperties,
  filterResponseModels,
  getHttpMetadata,
  getResultModelWithProperty,
  getSuccessResponse,
} from "./utils.js";

import {
  getEffectiveModelType,
  ignoreDiagnostics,
  IntrinsicType,
  isNeverType,
  Model,
  ModelProperty,
  Operation,
  Program,
  Scalar,
  Type,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  getHttpOperation,
  getOperationVerb,
  HttpOperation,
  isBody,
  isHeader,
} from "@typespec/http";
import {
  getActionDetails,
  getResourceLocationType,
  getResourceOperation,
  ResourceOperation,
} from "@typespec/rest";
import {
  extractLroStates,
  FinalOperationKey,
  getFinalLocationValue,
  getLroResult,
  getOperationLink,
  getOperationLinks,
  getPollingLocationInfo,
  isFinalLocation,
  isPollingLocation,
  LongRunningStates,
  OperationLinkMetadata,
  PollingLocationInfo,
  PollingOperationKey,
  pollingOptionsKind,
  StatusMonitorPollingLocationInfo,
} from "./decorators.js";
import { PropertyMap, StatusMonitorMetadata } from "./lro-info.js";

/**
 * Custom polling
 * Represents a property or header that provides a Uri linking to another operation
 */
export interface OperationLink {
  kind: "link";
  /** Indicates whether the link is in the response header or response body */
  location: "ResponseHeader" | "ResponseBody" | "Self";
  /** The property that contains the link */
  property: ModelProperty;
}

/**
 * Custom polling
 * Represents the property that contains the state and the terminal state values
 */
export type TerminationStatus = HttpTerminationStatus | ModelPropertyTerminationStatus;

/**
 * Definition of a StatusMonitor that uses http status rather then status code.
 */
export interface HttpTerminationStatus {
  kind: "status-code";
}

/**
 * Definition of a status monitor that uses a status field
 */
export interface ModelPropertyTerminationStatus {
  kind: "model-property";
  /** The property that contains the status */
  property: ModelProperty;
  /** The status values that indicate completion with success */
  succeededState: string[];
  /** The status values that indicate operation failure */
  failedState: string[];
  /** The status values that indicate operation cancellation, by the user or another actor */
  canceledState: string[];
}

/**
 * Custom polling
 * Represents the source of a parameter value when the client resolves an operation reference
 */
export interface ParameterSource {
  /* note this is just a hint to aid processing, the parameter contains a reference to the actual source property or parameter */
  location: "OperationParameters" | "RequestBody" | "Response";
  /** The name of the property or parameter */
  parameter: string;
}

/**
 * Custom polling
 * Represents a reference to an operation, including a map from the
 * original operation to the parameters of the linked operation
 */
export interface OperationReference {
  kind: "reference";
  /** The referenced operation */
  operation: Operation;
  /** information on how to construct the operation parameters from the original request and response */
  parameterMap?: Map<string, ParameterSource>;

  parameters?: Map<string, PropertyMap>;
}

/**
 * Custom polling
 * A step in a logical operation that involves multiple calls
 */
export interface LogicalOperationStep {
  /** The TypeSpec type that is returned by following a link or calling a lined operation */
  responseModel: Model | IntrinsicType;
}

/** Information on how to get to the StatusMonitor */
export type OperationStep =
  | NextOperationLink
  | NextOperationReference
  | PollingOperationStep
  | FinalOperationLink
  | FinalOperationReference
  | PollingSuccessProperty;

/**
 * Indicates that an operation step involves polling, and includes details on
 * how to end polling
 */
export interface PollingOperationStep extends LogicalOperationStep {
  kind: "pollingOperationStep";
  responseModel: Model;
  /** Information on how to determine when the operation reaches a terminal state (most often, this is the terminal values that may be returned in the status field) */
  terminationStatus: TerminationStatus;

  /** Property of the status monitor that contains the logical operation result (if any) */
  resultProperty?: ModelProperty;

  /** Property of the status monitor that contains operation errors in case of failure (if any) */
  errorProperty?: ModelProperty;
}

export type nextOperationStep = NextOperationLink | NextOperationReference;

/**
 * A resource link to the next operation
 */
export interface NextOperationLink extends LogicalOperationStep {
  kind: "nextOperationLink";
  responseModel: Model;
  /** information on how to get the uri to the status monitor */
  target: OperationLink;
}

/**
 * An operation link to the next operation
 */
export interface NextOperationReference extends LogicalOperationStep {
  kind: "nextOperationReference";
  responseModel: Model;
  /** Information on how to call the STatusMonitor operation */
  target: OperationReference;
}

/**
 * For long-running operations, a description of the final step for
 * getting to a success result
 */
export type FinalOperationStep =
  | FinalOperationLink
  | FinalOperationReference
  | PollingSuccessProperty
  | NoPollingSuccessProperty;

/**
 * For long-running operations, the resource link to the final result
 */
export interface FinalOperationLink extends LogicalOperationStep {
  kind: "finalOperationLink";

  /** if a link must be followed to get the result after polling completes, contains information about how to get the uri from the STatusMonitor */
  target: OperationLink;
}

/**
 * For long-running operations, the operation link to the final result
 */
export interface FinalOperationReference extends LogicalOperationStep {
  kind: "finalOperationReference";
  /** if another operation must be called to get the result after polling completes, contains information about how to call this operation */
  target: OperationReference;
}

/**
 * For long-running operations using a status monitor, describes the
 * property of the StatusMonitor that contains the success response
 */
export interface PollingSuccessProperty extends LogicalOperationStep {
  kind: "pollingSuccessProperty";
  responseModel: Model;
  /** The property containing the results of success */
  target: ModelProperty;
  /** The property in the response that contained a url to the status monitor */
  sourceProperty: ModelProperty | undefined;
}

export interface NoPollingSuccessProperty extends LogicalOperationStep {
  kind: "noPollingResult";
  responseModel: IntrinsicType;
}

/**
 * For long-running operations using a status monitor, indicates that
 * the operation has no logical final result when polling completes.
 */
export interface PollingSuccessNoResult extends LogicalOperationStep {
  kind: "pollingSuccessNoResult";
  /** There is no target */
  target: null;
}

/**
 * Azure SDK polling information: provides data contained in the
 * long-running-operation-options.final-state-via field
 */
export enum FinalStateValue {
  /** Poll the Azure-AsyncOperation header */
  azureAsyncOperation = "azure-async-operation",
  /** Poll the location header */
  location = "location",
  /** poll the Operation-Location header */
  operationLocation = "operation-location",
  /** poll (GET) the same uri as the original operation */
  originalUri = "original-uri",
  /** Poll on a header or field other than those above */
  customLink = "custom-link",
  /** Call a polling operation using the data in LroMetadata */
  customOperationReference = "custom-operation-reference",
}

/**
 * Information about long-running operations
 * For standard Lro Patterns, only the 'logicalResult' and 'finalStateVia' will be used.
 */
export interface LroMetadata {
  /** The operation that was processed */
  operation: Operation;

  /** The model representing important data returned on a success - clients will want to return this model */
  logicalResult: Model;

  /** An enumeration summarizing how a poller should reach a terminal state */
  finalStateVia: FinalStateValue;

  // custom polling information

  /** Specific information on how to reach the StatusMonitor, this is either instructions for constructing a call to the status monitor operation {NextOperationReference} ,
   * or the response property containing the url that points to the Statue Monitor {NextOperationLink}
   */
  statusMonitorStep?: NextOperationLink | NextOperationReference;

  /** Specific information about how to process the status monitor, including the location of status, success, and error fields, and the terminal states for polling */
  pollingInfo: PollingOperationStep;

  /** If another operation call is required after polling ends to get the results of the operation, a link to that 'final' operation */
  finalStep?: FinalOperationStep;

  /** The TypeSpec type of the object that contains the final result */
  envelopeResult: Model;

  /** The path to the field in the status monitor that contains results.  If undefined, then there is no results field in the status monitor */
  logicalPath?: string;

  /** The model representing important data returned on a success - clients will want to return this model. If undefined,
   *  then clients would want to return nothing.
   */
  finalResult?: Model | "void";

  /** The TypeSpec type of the object that contains the 'finalResult'. */
  finalEnvelopeResult?: Model | "void";

  /** The path to the field in the 'finalEnvelopeResult' that contains the 'finalResult'. */
  finalResultPath?: string;
}

/**
 *
 * @param program The program being processed
 * @param operation The operation to get Lwo Metadata for
 * @returns LroMetadata for the operation is it is long-running,
 * or nothing if the operation is synchronous, or lro information
 * cannot be processed.
 */
export function getLroMetadata(program: Program, operation: Operation): LroMetadata | undefined {
  const context: LroContext | undefined = ensureContext(program, operation, undefined);
  if (context === undefined) return undefined;
  processFinalReference(program, operation, context);
  processFinalLink(program, operation, context);
  const nextReference: NextOperationReference | undefined = processStatusMonitorReference(
    program,
    operation,
    context
  );
  if (nextReference !== undefined && nextReference.responseModel.kind === "Model") {
    context.statusMonitorStep = nextReference;
    processFinalReference(program, nextReference.target.operation, context);
    processFinalLink(program, nextReference.target.operation, context);
    context.pollingStep = getPollingStep(program, nextReference.responseModel, context);
    return createLroMetadata(program, operation, context);
  }

  if (processStatusMonitorLink(program, operation, context)) {
    return createLroMetadata(program, operation, context);
  }

  const originalStep = getPollingStep(program, operation, context);
  if (originalStep !== undefined) {
    context.pollingStep = originalStep;
    return createLroMetadata(program, operation, context);
  }

  return undefined;
}

/** internal interface describing the processing state of the lro
 * operation being processed.
 */
interface LroContext {
  visitedModels: Set<Model>;
  visitedOperations: Set<Operation>;
  httpOperation: HttpOperation;
  originalModel: Model;
  finalStep?: FinalOperationStep;
  finalOperationLink?: OperationLinkMetadata;
  pollingOperationLink?: OperationLinkMetadata;
  statusMonitorStep?: nextOperationStep;
  statusMonitorInfo?: StatusMonitorMetadata;
  pollingStep?: PollingOperationStep;
}

/** Contains all relevant data about a StatusMonitor, including
 * properties for success and error responses, and details about
 * lro status fields and values.
 */
interface StatusMonitorInfo {
  /** The TypeSpec Model type of the StatusMonitor */
  monitorType: Model;
  /** The type fo the 'results' field, if one exists */
  successType?: Model | IntrinsicType;
  /** The property reference for the 'results' field, if one exists  */
  successProperty?: ModelProperty;
  /** The type of the error field, if one exists */
  errorType?: Model;
  /** The property reference for the 'error' field, if one exists */
  errorProperty?: ModelProperty;
  /** The property reference for operation status field.  This property is always a string type. */
  statusProperty: ModelProperty;
  /** The terminal states that may be returned in the status field */
  lroStates: LongRunningStates;
}

/**
 * All data that can be retrieved from following a StatusMonitor
 * resource link, including polling status fields and values,
 * success and error responses, and potential final steps on
 * successful completion
 */
interface StatusMonitorLinkData {
  /** The model type for the StatusMonitor */
  model: Model;
  /** The link to the StatusMonitor operation */
  statusMonitor: OperationLink;
  /** Information about processing the status monitor including status, success, and error properties, and individual status values */
  pollingData: StatusMonitorInfo;
  /** If another operation call is required after polling ends to get the results of the operation, a link to that 'final' operation */
  final?: OperationLink;
  /** If another operation call is required after polling ends to get the results of the operation, The model type that operation returns */
  finalModel?: Model | IntrinsicType;
}

function createFinalOperationLink(
  program: Program,
  model: Model,
  property: ModelProperty
): FinalOperationStep {
  let resourceType: Model | undefined;
  // if finalOperationLink is a ResourceLocation, then the responseModel is the resource type
  if (property.type.kind === "Scalar" && property.type.name === "ResourceLocation") {
    resourceType = property.type.templateMapper?.args[0] as Model;
  }

  // override this value if specified by the `@finalLocation` decorator
  const override = getFinalLocationValue(program, property);
  return {
    kind: "finalOperationLink",
    responseModel: override ?? resourceType ?? model,
    target: {
      kind: "link",
      location: isHeader(program, property) ? "ResponseHeader" : "ResponseBody",
      property: property,
    },
  };
}

function createLroMetadata(
  program: Program,
  operation: Operation,
  context: LroContext
): LroMetadata | undefined {
  const [finalState, model] = getFinalStateVia(program, operation, context);
  if (finalState === undefined || model === undefined || context.pollingStep === undefined)
    return undefined;
  const logicalPathName =
    context.finalStep?.kind === "pollingSuccessProperty"
      ? context.finalStep.target.name
      : undefined;

  let finalResult: Model | "void" = model.kind === "Model" ? model : "void";
  let finalEnvelopeResult: Model | "void" = model.kind === "Model" ? model : "void";
  if (context.finalStep && context.finalStep.kind === "pollingSuccessProperty") {
    finalEnvelopeResult = context.pollingStep.responseModel;
  } else if (context.finalStep && context.finalStep.kind === "noPollingResult") {
    finalResult = "void";
    finalEnvelopeResult = "void";
  }
  return {
    operation: operation,
    logicalResult: model.kind === "Intrinsic" ? context.pollingStep.responseModel : model,
    finalStateVia: finalState,
    statusMonitorStep: context.statusMonitorStep,
    pollingInfo: context.pollingStep,
    finalStep: context.finalStep,
    envelopeResult: context.pollingStep.responseModel,
    logicalPath: logicalPathName,
    finalResult: finalResult,
    finalEnvelopeResult: finalEnvelopeResult,
    finalResultPath: logicalPathName,
  };
}

function createOperationLink(program: Program, modelProperty: ModelProperty): OperationLink {
  let location: "ResponseBody" | "ResponseHeader" | "Self" = "ResponseBody";
  if (isHeader(program, modelProperty)) location = "ResponseHeader";
  if (isBody(program, modelProperty)) location = "Self";
  return {
    kind: "link",
    location: location,
    property: modelProperty,
  };
}

function createOperationReference(metadata: OperationLinkMetadata): OperationReference | undefined {
  if (!metadata.parameterMap) return undefined;
  const map = new Map<string, ParameterSource>();
  if (metadata.parameterMap) {
    for (const [name, parameters] of metadata.parameterMap) {
      switch (parameters.sourceKind) {
        case "RequestBody":
          map.set(name, { location: "RequestBody", parameter: parameters.source.name });
          break;
        case "RequestParameter":
          map.set(name, { location: "OperationParameters", parameter: parameters.source.name });
          break;
        case "ResponseBody":
          map.set(name, { location: "Response", parameter: parameters.source.name });
          break;
      }
    }
    return {
      kind: "reference",
      operation: metadata.linkedOperation,
      parameterMap: map,
      parameters: metadata.parameterMap,
    };
  }

  return undefined;
}

function createPollingStep(pollingData: StatusMonitorInfo): PollingOperationStep {
  return {
    kind: "pollingOperationStep",
    responseModel: pollingData.monitorType,
    resultProperty: pollingData.successProperty,
    errorProperty: pollingData.errorProperty,
    terminationStatus: {
      kind: "model-property",
      canceledState: pollingData.lroStates.canceledState,
      failedState: pollingData.lroStates.failedState,
      succeededState: pollingData.lroStates.succeededState,
      property: pollingData.statusProperty,
    },
  };
}

function ensureContext(
  program: Program,
  operation: Operation,
  context: LroContext | undefined
): LroContext | undefined {
  if (context) return context;
  const [httpOperation, diagnostics] = getHttpOperation(program, operation);
  if (diagnostics !== undefined && diagnostics.length > 0) {
    program.reportDiagnostics(diagnostics);
  }

  const candidate = getSuccessResponse(program, httpOperation);
  if (candidate === undefined) return undefined;
  return {
    visitedModels: new Set<Model>(),
    visitedOperations: new Set<Operation>(),
    httpOperation: httpOperation,
    originalModel: candidate,
  };
}

function getBodyType(program: Program, model: Model): Model | undefined {
  const bodyProps = filterModelProperties(model, (p) => isBody(program, p));
  if (bodyProps.length === 1 && bodyProps[0].type.kind === "Model") return bodyProps[0].type;
  return undefined;
}

function getLogicalResourceOperation(
  program: Program,
  operation: Operation,
  model: Model | undefined
): ResourceOperation | undefined {
  const resOp = getResourceOperation(program, operation);
  if (resOp !== undefined) return resOp;
  if (model === undefined) return undefined;
  const bodyModel = getBodyType(program, model);
  if (bodyModel !== undefined) model = bodyModel;
  model = getEffectiveModelType(program, model);
  let resultOp: string;
  const verb = getOperationVerb(program, operation);
  switch (verb) {
    case "delete":
      resultOp = "delete";
      break;
    case "put":
      resultOp = "createOrReplace";
      break;
    default:
      return undefined;
  }

  return { operation: resultOp, resourceType: model };
}

function getFinalStateVia(
  program: Program,
  operation: Operation,
  context: LroContext
): [FinalStateValue, Model | IntrinsicType | undefined] {
  const operationAction = getActionDetails(program, operation);
  let model: Model | IntrinsicType | undefined =
    context.originalModel?.name !== undefined ? context.originalModel : undefined;
  let finalState: FinalStateValue = FinalStateValue.originalUri;
  const resOp = getLogicalResourceOperation(program, operation, model);
  if (operationAction !== undefined || resOp?.operation === "delete") {
    finalState = FinalStateValue.operationLocation;
    model = context.pollingStep?.responseModel ?? context.originalModel;
  }

  if (
    context.finalStep &&
    context.finalStep.kind !== "noPollingResult" &&
    (context.finalStep.kind !== "pollingSuccessProperty" ||
      resOp?.operation === undefined ||
      resOp.operation !== "createOrReplace")
  ) {
    model = context.finalStep.responseModel;
    if (
      context.finalStep.kind === "pollingSuccessProperty" &&
      context.statusMonitorStep !== undefined
    ) {
      switch (context.statusMonitorStep.kind) {
        case "nextOperationLink":
          finalState = getLroStatusFromHeaderProperty(
            program,
            context.statusMonitorStep.target.property
          );
          break;
        case "nextOperationReference":
          finalState = FinalStateValue.customOperationReference;
      }
    } else {
      finalState = getStatusFromLinkOrReference(program, operation, context.finalStep.target);
    }
    return [finalState, model];
  }

  if (
    resOp !== undefined &&
    resOp.operation !== undefined &&
    resOp.operation === "createOrReplace" &&
    resOp.resourceType !== undefined
  ) {
    model = resOp.resourceType;
    return [FinalStateValue.originalUri, model];
  }

  // handle actions and delete operations
  if (
    (operationAction !== undefined &&
      operationAction !== null &&
      context.statusMonitorStep !== undefined) ||
    (resOp?.operation === "delete" &&
      context.pollingStep !== undefined &&
      context.statusMonitorStep !== undefined) ||
    (operationAction === undefined &&
      resOp === undefined &&
      context.pollingStep !== undefined &&
      context.statusMonitorStep !== undefined)
  ) {
    const info = getStatusMonitorInfo(program, context.statusMonitorStep.responseModel);
    if (info !== undefined) {
      model = info.successType ?? program.checker.voidType;
      finalState = getStatusFromLinkOrReference(
        program,
        operation,
        context.statusMonitorStep?.target
      );
      if (context.finalStep === undefined && info.successProperty === undefined) {
        context.finalStep = { kind: "noPollingResult", responseModel: program.checker.voidType };
      }
    }
  }

  return [finalState, model];
}

function getLroStatusFromHeaderProperty(
  program: Program,
  property: ModelProperty | undefined
): FinalStateValue {
  let finalState: FinalStateValue;
  if (property === undefined || !isHeader(program, property)) return FinalStateValue.customLink;
  const name = getHeaderFieldName(program, property);
  if (name === undefined) return FinalStateValue.customLink;

  switch (name.toLowerCase()) {
    case "operation-location":
      finalState = FinalStateValue.operationLocation;
      break;
    case "azure-asyncoperation":
    case "azureasyncoperation":
      finalState = FinalStateValue.azureAsyncOperation;
      break;
    case "location":
      finalState = FinalStateValue.location;
      break;
    default:
      finalState = FinalStateValue.customLink;
  }

  return finalState;
}

function getLroStatusProperty(program: Program, model: Model): ModelProperty | undefined {
  const properties = filterModelProperties(
    model,
    (prop) => ignoreDiagnostics(extractLroStates(program, prop)) !== undefined
  );
  return properties.length > 0 ? properties[0] : undefined;
}

function getPollingStep(
  program: Program,
  modelOrOperation: Model | Operation,
  context: LroContext
): PollingOperationStep | undefined {
  function getModel(property: ModelProperty | undefined) {
    return property?.type.kind === "Model" ? property.type : undefined;
  }
  let info: StatusMonitorInfo | undefined;
  if (!context.pollingOperationLink) {
    context.pollingOperationLink = getOperationLink(
      program,
      context.httpOperation.operation,
      PollingOperationKey
    );
  }
  if (context.pollingOperationLink?.parameterMap === undefined) return undefined;
  const statusMonitorOverride = context.pollingOperationLink?.result?.statusMonitor;
  if (statusMonitorOverride !== undefined && statusMonitorOverride.monitorType !== undefined) {
    info = {
      lroStates: statusMonitorOverride.lroStates,
      monitorType: statusMonitorOverride.monitorType,
      statusProperty: statusMonitorOverride.statusProperty,
      errorProperty: statusMonitorOverride.errorProperty,
      errorType: getModel(statusMonitorOverride.errorProperty),
      successProperty: statusMonitorOverride.successProperty,
      successType: getModel(statusMonitorOverride.successProperty),
    };

    return createPollingStep(info);
  }

  switch (modelOrOperation.kind) {
    case "Operation":
      const httpOperation = getHttpMetadata(program, modelOrOperation);
      info = GetStatusMonitorInfoFromOperation(program, httpOperation);
      break;
    case "Model":
      info = getStatusMonitorInfo(program, modelOrOperation);
      break;
  }

  if (info === undefined) return undefined;
  return createPollingStep(info);
}

function getStatusFromLinkOrReference(
  program: Program,
  sourceOperation: Operation,
  target: OperationLink | OperationReference | ModelProperty
): FinalStateValue {
  let finalState: FinalStateValue = FinalStateValue.originalUri;
  switch (target.kind) {
    case "link":
      {
        switch (target.location) {
          case "ResponseBody":
            finalState = FinalStateValue.customLink;
            break;
          case "ResponseHeader":
            finalState = getLroStatusFromHeaderProperty(program, target.property);
            break;
        }
      }
      break;
    case "reference":
      {
        finalState = FinalStateValue.customOperationReference;
        if (isMatchingGetOperation(program, sourceOperation, target.operation)) {
          finalState = FinalStateValue.originalUri;
        }
      }
      break;
  }

  return finalState;
}

/**
 * Extracts status monitor information from a pollingLink
 * @param program The program being processed
 * @param link The link to the status monitor
 */
function getStatusMonitorInfo(
  program: Program,
  modelOrLink: Model | OperationLink,
  pollingOverride?: PollingLocationInfo
): StatusMonitorInfo | undefined {
  if (pollingOverride?.kind === pollingOptionsKind.StatusMonitor) {
    return {
      ...pollingOverride.info,
    };
  }
  if (modelOrLink.kind === "link") {
    if (modelOrLink.property === undefined) return undefined;
    const statusMonitorType = resolveOperationLocation(program, modelOrLink.property);
    if (statusMonitorType === undefined || statusMonitorType.kind === "Intrinsic") return undefined;
    modelOrLink = statusMonitorType;
  }

  const statusProperty = getLroStatusProperty(program, modelOrLink);
  if (statusProperty === undefined) return undefined;
  const successInfo = getTargetModelInformation(program, modelOrLink);
  const lroStates = ignoreDiagnostics(extractLroStates(program, statusProperty));
  if (lroStates === undefined) return undefined;
  return {
    monitorType: modelOrLink,
    successType: successInfo !== undefined ? successInfo[0] : undefined,
    successProperty: successInfo !== undefined ? successInfo[1] : undefined,
    statusProperty: statusProperty,
    lroStates: lroStates,
  };
}

function GetStatusMonitorInfoFromOperation(
  program: Program,
  operation: HttpOperation
): StatusMonitorInfo | undefined {
  const models = filterResponseModels(
    operation,
    (model) =>
      filterModelProperties(
        model,
        (prop) => ignoreDiagnostics(extractLroStates(program, prop)) !== undefined
      ).length > 0
  );
  if (models === undefined || models.length < 1) return undefined;
  return getStatusMonitorInfo(program, models[0]);
}

function getStatusMonitorLinks(
  program: Program,
  operation: HttpOperation
): StatusMonitorLinkData | undefined {
  const models: Model[] | undefined = filterResponseModels(
    operation,
    (model) =>
      filterModelProperties(
        model,
        (prop) => isPollingLocation(program, prop) || isFinalLocation(program, prop)
      ).length > 0
  );
  if (models === undefined || models.length < 1) return undefined;
  return getStatusMonitorLinksFromModel(program, models[0]);
}

function getStatusMonitorLinksFromModel(
  program: Program,
  model: Model
): StatusMonitorLinkData | undefined {
  let pollingData: StatusMonitorPollingLocationInfo | undefined = undefined;
  let pollingLinks: ModelProperty[] | undefined = filterModelProperties(model, (prop) =>
    isPollingLocation(program, prop)
  );
  if (pollingLinks === undefined) return undefined;
  // favor status monitor links over stepwise polling
  if (pollingLinks.length > 1) {
    pollingLinks = pollingLinks.filter((p) => !isBody(program, p));
  }
  const pollingProperty = pollingLinks[0];
  pollingData = getPollingLocationInfo(program, pollingProperty);
  const pollingLink = createOperationLink(program, pollingProperty);
  const monitorInfo = getStatusMonitorInfo(program, pollingLink, pollingData);
  if (monitorInfo === undefined) return undefined;
  let finalLinks: ModelProperty[] | undefined = filterModelProperties(model, (prop) =>
    isFinalLocation(program, prop)
  );
  if ((finalLinks === undefined || finalLinks.length !== 1) && monitorInfo.monitorType) {
    finalLinks = filterModelProperties(monitorInfo.monitorType, (prop) =>
      isFinalLocation(program, prop)
    );
  }
  const finalLink =
    finalLinks === undefined || finalLinks.length !== 1
      ? undefined
      : createOperationLink(program, finalLinks[0]);
  let finalTarget: Model | IntrinsicType | undefined;
  if (finalLink !== undefined && finalLink.property !== undefined) {
    finalTarget = resolveOperationLocation(program, finalLink.property);
  }
  return {
    model: monitorInfo.monitorType,
    statusMonitor: pollingLink,
    pollingData: monitorInfo,
    final: finalLink,
    finalModel: finalTarget,
  };
}

/**
 * Gets the target model, as defined in the status monitor, either through result property
 * or `@finalLocation` links
 * @param program The program being processed
 * @param link The link pointing to the monitor
 */
function getTargetModelInformation(
  program: Program,
  modelOrLink: OperationLink | Model | IntrinsicType
): [Model | IntrinsicType, ModelProperty | undefined] | undefined {
  if (modelOrLink.kind === "Intrinsic") return undefined;
  if (modelOrLink.kind === "link") {
    if (modelOrLink.property === undefined) return undefined;
    const linkModel = resolveOperationLocation(program, modelOrLink.property);
    if (linkModel === undefined || linkModel.kind === "Intrinsic") return undefined;
    modelOrLink = linkModel;
  }

  const finalLinkProps = filterModelProperties(modelOrLink, (prop) =>
    isFinalLocation(program, prop)
  );
  const resultProps = filterModelProperties(modelOrLink, (prop) => isResultProperty(program, prop));

  if (finalLinkProps.length === 1) {
    const result = resolveOperationLocation(program, finalLinkProps[0]);
    if (result !== undefined) return [result, finalLinkProps[0]];
  }

  if (
    resultProps.length === 1 &&
    !isNeverType(resultProps[0].type) &&
    resultProps[0].type.kind === "Model"
  ) {
    return [resultProps[0].type, resultProps[0]];
  }

  return undefined;
}

function isMatchingGetOperation(
  program: Program,
  sourceOperation: Operation,
  targetOperation: Operation
): boolean {
  const sourceHttp = getHttpMetadata(program, sourceOperation);
  const targetHttp = getHttpMetadata(program, targetOperation);
  return sourceHttp.path === targetHttp.path && targetHttp.verb === "get";
}

function isResultProperty(program: Program, property: ModelProperty): boolean {
  if (property.model !== undefined) {
    const [lroResult, _] = getLroResult(program, property.model);
    if (lroResult !== undefined) {
      return lroResult.name === property.name;
    }
  }
  return property.name === "result";
}

function processFinalLink(
  program: Program,
  modelOrOperation: Model | Operation,
  context: LroContext
): void {
  // Allow @finalOperation to override link types
  const overrideModel = context.finalOperationLink?.result?.type;
  if (context.finalStep !== undefined) return;
  switch (modelOrOperation.kind) {
    case "Operation":
      {
        const result = getResultModelWithProperty(program, modelOrOperation, (prop) =>
          isFinalLocation(program, prop)
        );
        if (result === undefined) return;
        const [model, property] = result;
        context.finalStep = createFinalOperationLink(program, overrideModel ?? model, property);
      }
      break;
    case "Model":
      {
        const outProperties: ModelProperty[] = filterModelProperties(modelOrOperation, (prop) =>
          isFinalLocation(program, prop)
        );
        if (outProperties === undefined || outProperties.length !== 1) return;
        context.finalStep = createFinalOperationLink(
          program,
          overrideModel ?? modelOrOperation,
          outProperties[0]
        );
      }
      break;
  }
}

function processFinalReference(program: Program, operation: Operation, context: LroContext): void {
  if (context.finalStep !== undefined) return;
  // looks for operation marked with @finalOperation
  const link = getOperationLink(program, operation, "final");
  if (link === undefined || link.parameterMap === undefined || link.result?.type === undefined)
    return;
  context.finalOperationLink = link;
  const reference = createOperationReference(link);
  if (reference === undefined) return;
  context.finalStep = {
    kind: "finalOperationReference",
    responseModel: link.result?.type,
    target: reference,
  };
}

function createStatusMonitorPollingData(data: StatusMonitorMetadata): StatusMonitorInfo {
  function getModel(property: ModelProperty | undefined) {
    return property?.type.kind === "Model" ? property.type : undefined;
  }
  return {
    lroStates: data.lroStates,
    monitorType: data.monitorType,
    statusProperty: data.statusProperty,
    errorProperty: data.errorProperty,
    errorType: getModel(data.errorProperty),
    successProperty: data.successProperty,
    successType: getModel(data.successProperty),
  };
}

function processStatusMonitorLink(
  program: Program,
  modelOrOperation: Model | Operation,
  context: LroContext
): boolean {
  let lroData: StatusMonitorLinkData | undefined;

  if (context.pollingOperationLink?.result?.statusMonitor && context.pollingOperationLink?.link) {
    const polling = createStatusMonitorPollingData(
      context.pollingOperationLink.result.statusMonitor
    );
    lroData = {
      model: context.pollingOperationLink.result.statusMonitor.monitorType,
      pollingData: polling,
      statusMonitor: context.pollingOperationLink.link,
    };
  } else {
    switch (modelOrOperation.kind) {
      case "Operation":
        lroData = getStatusMonitorLinks(program, context.httpOperation);
        break;
      case "Model":
        lroData = getStatusMonitorLinksFromModel(program, modelOrOperation);
        break;
    }
  }
  if (lroData === undefined || lroData.statusMonitor === undefined) {
    return false;
  }

  context.pollingStep = createPollingStep(lroData.pollingData);
  if (context.finalStep === undefined) {
    if (lroData.final !== undefined && lroData.finalModel !== undefined) {
      context.finalStep = {
        kind: "finalOperationLink",
        responseModel: lroData.finalModel,
        target: lroData.final,
      };
    } else if (
      lroData.pollingData.successProperty !== undefined &&
      lroData.pollingData.successType !== undefined &&
      lroData.pollingData.successType.kind !== "Intrinsic"
    ) {
      const final: PollingSuccessProperty = {
        kind: "pollingSuccessProperty",
        target: lroData.pollingData.successProperty,
        responseModel: lroData.pollingData.successType,
        sourceProperty: lroData.statusMonitor.property,
      };
      context.finalStep = final;
    }
  }
  context.statusMonitorStep = {
    kind: "nextOperationLink",
    responseModel: lroData.model,
    target: lroData.statusMonitor,
  };

  return true;
}

function processStatusMonitorReference(
  program: Program,
  referencedOperation: Operation,
  context: LroContext
): NextOperationReference | undefined {
  const references: Map<string, OperationLinkMetadata> | undefined = getOperationLinks(
    program,
    referencedOperation
  );
  if (references === undefined) return undefined;

  const pollingData: OperationLinkMetadata | undefined = references.get(PollingOperationKey);
  if (pollingData === undefined) return undefined;
  context.pollingOperationLink = pollingData;
  const pollingReference = createOperationReference(pollingData);
  if (pollingReference === undefined) return undefined;
  context.statusMonitorInfo = pollingData.result?.statusMonitor;
  const finalData: OperationLinkMetadata | undefined = references.get(FinalOperationKey);
  if (context.finalStep === undefined && finalData !== undefined) {
    const finalReference = createOperationReference(finalData);
    const finalModel = finalData?.result?.type;
    if (finalReference !== undefined && finalModel !== undefined) {
      context.finalStep = {
        kind: "finalOperationReference",
        responseModel: finalModel,
        target: finalReference,
      };
    }
  }
  if (
    context.finalStep === undefined &&
    pollingData.result?.statusMonitor?.successProperty !== undefined &&
    pollingData.result.statusMonitor.successProperty.type.kind === "Model"
  ) {
    context.finalStep = {
      kind: "pollingSuccessProperty",
      target: pollingData.result.statusMonitor.successProperty,
      responseModel: pollingData.result.statusMonitor.successProperty.type,
      sourceProperty: pollingData.result.statusMonitor.successProperty,
    };
  }
  const responseModel = pollingData.result?.type;
  if (responseModel === undefined) return undefined;
  return {
    kind: "nextOperationReference",
    responseModel: responseModel,
    target: pollingReference,
  };
}

function resolveOperationLocation(
  program: Program,
  property: ModelProperty
): Model | IntrinsicType | undefined {
  const override = getFinalLocationValue(program, property);
  if (override) return override;
  const resolvedScalar: Scalar | undefined = resolveToScalarType(program, property.type);
  if (resolvedScalar === undefined) return undefined;
  resolveOperationLocation;
  return getResourceLocationType(program, resolvedScalar);
}

function resolveToScalarType(program: Program, type: Type): Scalar | undefined {
  switch (type.kind) {
    case "Scalar":
      return type;
  }
  return undefined;
}
