import {
  Diagnostic,
  IntrinsicType,
  Model,
  ModelProperty,
  Operation,
  Program,
  Union,
  UnionVariant,
  compilerAssert,
  createDiagnosticCollector,
  getEffectiveModelType,
  ignoreDiagnostics,
  isErrorType,
  isType,
} from "@typespec/compiler";
import {
  HttpOperationResponse,
  getHeaderFieldName,
  getHttpOperation,
  getResponsesForOperation,
  isBody,
  isBodyRoot,
  isHeader,
  isMetadata,
} from "@typespec/http";
import {
  LongRunningStates,
  extractLroStates,
  getLongRunningStates,
  getLroErrorResult,
  getLroResult,
  getLroStatusProperty,
  getPollingOperationParameter,
  isPollingLocation,
} from "./decorators.js";
import { createDiagnostic } from "./lib.js";
import { ModelPropertyTerminationStatus, OperationLink } from "./lro-helpers.js";
import { getAllProperties } from "./utils.js";

export interface LroOperationInfo {
  getInvocationInfo(): OperationInvocationInfo | undefined;
  getOperationLink(): OperationLink | undefined;
  getResultInfo(): ResultInfo | undefined;
}

export interface OperationInvocationInfo {
  parameterMap?: Map<string, PropertyMap>;
  operation: Operation;
}

export interface PropertyMap {
  sourceKind: SourceKind;
  source: ModelProperty;
  target: ModelProperty;
}

export interface ResultInfo {
  /** The model type of the status monitor */
  type?: Model;

  /** information about the linked status monitor */
  statusMonitor?: StatusMonitorMetadata;
}
/** Metadata for the STatusMonitor */
export interface StatusMonitorMetadata {
  /** The model type of the status monitor */
  monitorType: Model;
  /** Information on polling status property and termina states */
  terminationInfo: ModelPropertyTerminationStatus;

  lroStates: LongRunningStates;

  /** The property containing the response when polling terminates with success */
  successProperty?: ModelProperty;

  /** The property containing error information when polling terminates with failure */
  errorProperty?: ModelProperty;

  statusProperty: ModelProperty;

  successType: Model | IntrinsicType;

  errorType?: Model;
}

export type SourceKind = "RequestParameter" | "RequestBody" | "ResponseBody";

export function extractStatusMonitorInfo(
  program: Program,
  model: Model,
  statusProperty: ModelProperty,
): [StatusMonitorMetadata | undefined, readonly Diagnostic[]] {
  const diagnosticsToToss = createDiagnosticCollector();
  const diagnosticsToKeep = createDiagnosticCollector();
  const lroResult = diagnosticsToKeep.pipe(getLroResult(program, model, true));
  const successProperty: ModelProperty | undefined =
    lroResult?.kind === "ModelProperty" ? lroResult : undefined;
  const errorProperty: ModelProperty | undefined = diagnosticsToKeep.pipe(
    getLroErrorResult(program, model, true),
  );
  const states: LongRunningStates | undefined =
    getLongRunningStates(program, statusProperty) ??
    diagnosticsToToss.pipe(extractLroStates(program, statusProperty));
  if (!states || !statusProperty) return diagnosticsToKeep.wrap(undefined);
  return diagnosticsToKeep.wrap({
    monitorType: getEffectiveModelType(program, model, (p) => !isMetadata(program, p)) ?? model,
    successProperty: successProperty,
    errorProperty: errorProperty,
    statusProperty: statusProperty,
    lroStates: states,
    errorType: errorProperty?.type.kind === "Model" ? errorProperty.type : undefined,
    successType:
      successProperty?.type?.kind === "Intrinsic" || successProperty?.type?.kind === "Model"
        ? successProperty.type
        : program.checker.voidType,
    terminationInfo: {
      kind: "model-property",
      property: statusProperty,
      canceledState: states.canceledState,
      failedState: states.failedState,
      succeededState: states.succeededState,
    },
  });
}

function getBodyModel(program: Program, model: Model): Model | undefined {
  const bodyProps = [...getAllProperties(model).values()].filter(
    (p) => isBody(program, p) || isBodyRoot(program, p)
  );
  if (bodyProps.length !== 1) return undefined;
  const outType = bodyProps[0].type;
  if (outType.kind !== "Model") return undefined;
  return outType;
}

export function getLroOperationInfo(
  program: Program,
  sourceOperation: Operation,
  targetOperation: Operation,
  parameters?: Model,
): [LroOperationInfo | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const targetResponses = diagnostics.pipe(getResponsesForOperation(program, targetOperation));
  const targetParameters = ignoreDiagnostics(getHttpOperation(program, targetOperation)).parameters;
  const targetProperties = new Map<string, ModelProperty>();
  const parameterMap = new Map<string, PropertyMap>();
  const unmatchedParameters = new Set<string>(targetParameters.parameters.flatMap((p) => p.name));
  for (const parameter of targetParameters.parameters) {
    targetProperties.set(parameter.name, parameter.param);
  }
  if (targetParameters.body) {
    const body = targetParameters.body;
    if (body.bodyKind === "single" && body.property) {
      targetProperties.set(body.property.name, body.property);
    } else if (body.type.kind === "Model") {
      for (const [name, param] of getAllProperties(body.type)) {
        targetProperties.set(name, param);
      }
    }
  }
  const sourceResponses = diagnostics.pipe(getResponsesForOperation(program, sourceOperation));
  const sourceParameters = ignoreDiagnostics(getHttpOperation(program, sourceOperation)).parameters;
  const sourceBodyProperties = new Map<string, ModelProperty>();
  if (sourceParameters.body && sourceParameters.body.type.kind === "Model") {
    for (const [sourceName, sourceProp] of getAllProperties(sourceParameters.body.type)) {
      sourceBodyProperties.set(sourceName, sourceProp);
      handleExplicitParameterMap(sourceProp, "RequestBody");
    }
  }
  const sourceParamProperties = new Map<string, ModelProperty>();
  for (const parameter of sourceParameters.parameters) {
    sourceParamProperties.set(parameter.name, parameter.param);
    handleExplicitParameterMap(parameter.param, "RequestParameter");
  }
  const sourceResponseProperties = new Map<string, ModelProperty>();
  let pollingLink: OperationLink | undefined = undefined;
  let resultModel: Model | undefined;
  for (const response of targetResponses) {
    visitResponse(program, response, (model) => {
      if (!isErrorType(model) && resultModel === undefined) {
        if (resultModel === undefined) {
          resultModel = getBodyModel(program, model);
          if (resultModel === undefined) {
            resultModel = getEffectiveModelType(program, model, (p) => !isMetadata(program, p));
          }
        }
      }
    });
  }
  let statusMonitor: StatusMonitorMetadata | undefined = undefined;
  for (const response of sourceResponses) {
    visitResponse(program, response, undefined, (name, prop) => {
      sourceResponseProperties.set(name, prop);
      handleExplicitParameterMap(prop, "ResponseBody");
      const link = extractPollinglink(prop);
      if (link && !pollingLink) {
        pollingLink = link;
      }
    });
  }

  gatherLroParameters();
  diagnostics.pipe(getStatusMonitorInfo());

  function gatherLroParameters(): void {
    if (unmatchedParameters.size > 0) {
      for (const [targetName, targetProperty] of targetProperties) {
        getLroParameterFromProperty(
          targetName,
          targetProperty,
          sourceParamProperties,
          "RequestParameter",
        );
        sourceBodyProperties.size > 0 &&
          getLroParameterFromProperty(
            targetName,
            targetProperty,
            sourceBodyProperties,
            "RequestBody",
          );
        sourceResponseProperties.size > 0 &&
          getLroParameterFromProperty(
            targetName,
            targetProperty,
            sourceResponseProperties,
            "ResponseBody",
          );
      }
    }

    if (parameters === undefined) return;

    for (const [_, parameter] of getAllProperties(parameters)) {
      processModelPropertyFromParameterMap(parameter);
    }
  }

  function getStatusMonitorInfo(): [StatusMonitorMetadata | undefined, readonly Diagnostic[]] {
    let result: StatusMonitorMetadata | undefined = undefined;
    const diagnostics = createDiagnosticCollector();
    for (const response of targetResponses) {
      visitResponse(program, response, (m) => {
        const status = getLroStatusProperty(program, m);
        if (status !== undefined) {
          result = diagnostics.pipe(extractStatusMonitorInfo(program, m, status));
        }
      });

      if (result) {
        break;
      }
    }

    statusMonitor = result;

    return diagnostics.wrap(result);
  }

  function handleExplicitParameterMap(source: ModelProperty, kind: SourceKind): void {
    const directMapping = getPollingOperationParameter(program, source);
    if (directMapping === undefined) return;
    let targetName: string = directMapping as string;
    let targetProperty = directMapping as ModelProperty;
    if (targetName.length > 0 && targetProperties.has(targetName)) {
      targetProperty = targetProperties.get(targetName)!;
    }
    targetName = targetProperty.name;

    parameterMap.set(targetName, { source: source, target: targetProperty, sourceKind: kind });
    unmatchedParameters.delete(targetName);
  }

  function getLroParameterFromProperty(
    targetName: string,
    targetProperty: ModelProperty,
    sourceProperties: Map<string, ModelProperty>,
    sourceKind: SourceKind,
  ): void {
    const sourceProperty = sourceProperties.get(targetName);
    if (sourceProperty !== undefined) {
      parameterMap.set(targetName, {
        sourceKind: sourceKind,
        source: sourceProperty,
        target: targetProperty,
      });

      unmatchedParameters.delete(targetName);
    }
  }

  function visitResponse(
    program: Program,
    response: HttpOperationResponse,
    modelAction?: (m: Model) => void,
    modelPropertyAction?: (name: string, prop: ModelProperty) => void,
  ): void {
    function visitModel(model: Model) {
      modelAction && modelAction(model);
      if (modelPropertyAction) {
        for (const [name, prop] of getAllProperties(model)) {
          modelPropertyAction(name, prop);
        }
      }
    }

    function visitUnion(union: Union) {
      for (const [_, prop] of union.variants) {
        visitVariant(prop);
      }
    }

    function visitVariant(variant: UnionVariant) {
      switch (variant.type.kind) {
        case "Model":
          visitModel(variant.type);
          break;
        case "Union":
          visitUnion(variant.type);
          break;
        default:
          // do nothing
          break;
      }
    }

    if (isErrorType(response.type)) return;
    switch (response.type.kind) {
      case "Model":
        visitModel(response.type);
        break;
      case "Union":
        visitUnion(response.type);
        break;
      default:
      // throw diagnostic
    }
  }

  function processModelPropertyFromParameterMap(property: ModelProperty): void {
    if (property.type.kind !== "Model") {
      diagnostics.add(
        createDiagnostic({
          code: "operation-link-parameter-invalid",
          target: sourceOperation,
          format: {},
        }),
      );
      return;
    }

    const propMap = property.type;
    const typeName = propMap.name;
    const namespace = propMap.namespace?.name;
    if (
      namespace !== "Core" ||
      (typeName !== "RequestParameter" && typeName !== "ResponseProperty")
    ) {
      diagnostics.add(
        createDiagnostic({
          code: "operation-link-parameter-invalid",
          target: sourceOperation,
          format: {},
        }),
      );
      return;
    }
    const targetProperty = targetProperties.get(property.name);
    if (targetProperty === undefined) {
      diagnostics.add(
        createDiagnostic({
          code: "operation-link-parameter-invalid-target",
          target: targetOperation,
          format: { name: property.name },
        }),
      );
      return;
    }
    let sourceProperty = propMap.templateMapper!.args[0];
    if (sourceProperty.entityKind === "Indeterminate") {
      sourceProperty = sourceProperty.type;
    } else if (!isType(sourceProperty)) {
      compilerAssert(false, "Lro Template Arg should be a Type", propMap);
    }
    switch (sourceProperty.kind) {
      case "String":
        const sourcePropertyName = sourceProperty.value;
        if (typeName === "RequestParameter") {
          let sourceParam = sourceParamProperties.get(sourcePropertyName);
          if (sourceParam !== undefined) {
            unmatchedParameters.delete(property.name);
            parameterMap.set(property.name, {
              sourceKind: "RequestParameter",
              source: sourceParam,
              target: targetProperty,
            });
            return;
          }
          sourceParam = sourceBodyProperties.get(sourcePropertyName);
          if (sourceParam !== undefined) {
            unmatchedParameters.delete(property.name);
            parameterMap.set(property.name, {
              sourceKind: "RequestBody",
              source: sourceParam,
              target: targetProperty,
            });
            return;
          }

          diagnostics.add(
            createDiagnostic({
              code: "request-parameter-invalid",
              target: sourceOperation,
              format: { name: sourcePropertyName },
            }),
          );
          return;
        } else if (typeName === "ResponseProperty") {
          const sourceParam = sourceResponseProperties.get(sourcePropertyName);

          if (sourceParam === undefined) {
            diagnostics.add(
              createDiagnostic({
                code: "response-property-invalid",
                target: sourceOperation,
                format: { name: sourcePropertyName },
              }),
            );
            return;
          }

          unmatchedParameters.delete(property.name);
          parameterMap.set(property.name, {
            source: sourceParam,
            target: targetProperty,
            sourceKind: "ResponseBody",
          });
        }
    }
  }

  function extractPollinglink(property: ModelProperty): OperationLink | undefined {
    let isKnownLinkHeader: boolean = false;
    if (isHeader(program, property)) {
      const headerName = getHeaderFieldName(program, property).toLowerCase();
      isKnownLinkHeader = headerName === "operation-location";
    }

    if (isPollingLocation(program, property) || isKnownLinkHeader) {
      return {
        kind: "link",
        property: property,
        location: isHeader(program, property) ? "ResponseHeader" : "ResponseBody",
      };
    }
    return undefined;
  }

  function ValidateInfo(): boolean {
    return resultModel !== undefined;
  }

  function getInvocationInfo(): OperationInvocationInfo | undefined {
    return {
      operation: targetOperation,
      parameterMap: unmatchedParameters.size < 1 ? parameterMap : undefined,
    };
  }

  function getOperationLink(): OperationLink | undefined {
    return pollingLink;
  }

  function getResultInfo(): ResultInfo | undefined {
    return {
      type: resultModel,
      statusMonitor: statusMonitor,
    };
  }

  return diagnostics.wrap(
    ValidateInfo() ? { getInvocationInfo, getOperationLink, getResultInfo } : undefined,
  );
}
