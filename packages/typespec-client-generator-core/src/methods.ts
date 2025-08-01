import {
  FinalOperationStep,
  getLroMetadata,
  getPagedResult,
  getParameterizedNextLinkArguments,
  NextOperationLink,
  NextOperationReference,
  OperationLink,
  OperationReference,
  PollingOperationStep,
  TerminationStatus,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  Diagnostic,
  getSummary,
  ignoreDiagnostics,
  isList,
  Model,
  ModelProperty,
  Operation,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { isHeader } from "@typespec/http";
import { createSdkClientType } from "./clients.js";
import {
  getAccess,
  getOverriddenClientMethod,
  getResponseAsBool,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldGenerateConvenient,
  shouldGenerateProtocol,
} from "./decorators.js";
import { getSdkHttpOperation } from "./http.js";
import {
  SdkClient,
  SdkClientType,
  SdkLroPagingServiceMethod,
  SdkLroServiceFinalResponse,
  SdkLroServiceFinalStep,
  SdkLroServiceMetadata,
  SdkLroServiceMethod,
  SdkMethod,
  SdkMethodParameter,
  SdkMethodResponse,
  SdkModelPropertyType,
  SdkModelType,
  SdkNextOperationLink,
  SdkNextOperationReference,
  SdkOperationGroup,
  SdkOperationLink,
  SdkOperationReference,
  SdkPagingServiceMethod,
  SdkPollingOperationStep,
  SdkPropertyMap,
  SdkServiceMethod,
  SdkServiceOperation,
  SdkServiceResponseHeader,
  SdkTerminationStatus,
  SdkType,
  TCGCContext,
  UsageFlags,
} from "./interfaces.js";
import {
  createGeneratedName,
  findRootSourceProperty,
  getAllResponseBodiesAndNonBodyExists,
  getAvailableApiVersions,
  getClientDoc,
  getHashForType,
  getTypeDecorators,
  isNeverOrVoidType,
  isSubscriptionId,
  twoParamsEquivalent,
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
import {
  getCrossLanguageDefinitionId,
  getHttpOperationWithCache,
  getLibraryName,
} from "./public-utils.js";
import {
  getClientTypeWithDiagnostics,
  getSdkBuiltInType,
  getSdkModel,
  getSdkModelPropertyType,
  getSdkModelPropertyTypeBase,
} from "./types.js";
function getSdkServiceOperation<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
  methodParameters: SdkMethodParameter[],
): [TServiceOperation, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const httpOperation = getHttpOperationWithCache(context, operation);
  if (httpOperation) {
    const sdkHttpOperation = diagnostics.pipe(
      getSdkHttpOperation(context, httpOperation, methodParameters),
    ) as TServiceOperation;
    return diagnostics.wrap(sdkHttpOperation);
  }
  diagnostics.add(
    createDiagnostic({
      code: "unsupported-protocol",
      target: operation,
      format: {},
    }),
  );
  return diagnostics.wrap(undefined as any);
}
function getSdkLroPagingServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
  client: SdkClientType<TServiceOperation>,
): [SdkLroPagingServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkLroServiceMethod<TServiceOperation>(context, operation, client)),
    ...diagnostics.pipe(getSdkPagingServiceMethod<TServiceOperation>(context, operation, client)),
    kind: "lropaging",
  });
}

function getSdkPagingServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
  client: SdkClientType<TServiceOperation>,
): [SdkPagingServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  const baseServiceMethod = diagnostics.pipe(
    getSdkBasicServiceMethod<TServiceOperation>(context, operation, client),
  );

  // nullable response type means the underlaying operation has multiple responses and only one of them is not empty, which is what we want
  let responseType = baseServiceMethod.response.type;
  if (responseType?.kind === "nullable") {
    responseType = responseType.type;
  }

  // normal paging
  if (isList(context.program, operation)) {
    const pagingMetadata = $(context.program).operation.getPagingMetadata(
      getOverriddenClientMethod(context, operation) ?? operation,
    );

    if (responseType?.__raw?.kind !== "Model" || responseType.kind !== "model" || !pagingMetadata) {
      diagnostics.add(
        createDiagnostic({
          code: "unexpected-pageable-operation-return-type",
          target: operation,
          format: {
            operationName: operation.name,
          },
        }),
      );
      // return as page method with no paging info
      return diagnostics.wrap({
        ...baseServiceMethod,
        kind: "paging",
        pagingMetadata: {
          pageSizeParameter: findPageSizeParameter(context, baseServiceMethod.parameters),
        },
      });
    }

    const resultSegments = mapFirstSegmentForResultSegments(
      pagingMetadata.output.pageItems.path,
      baseServiceMethod.response,
    );
    const nextLinkSegments = mapFirstSegmentForResultSegments(
      pagingMetadata.output.nextLink?.path,
      baseServiceMethod.response,
    );
    const continuationTokenResponseSegments = mapFirstSegmentForResultSegments(
      pagingMetadata.output.continuationToken?.path,
      baseServiceMethod.response,
    );

    baseServiceMethod.response.resultSegments = resultSegments?.map(
      (resultSegment) => context.__modelPropertyCache.get(resultSegment)!,
    );

    context.__pagedResultSet.add(responseType);
    // tcgc will let all paging method return a list of items
    baseServiceMethod.response.type = diagnostics.pipe(
      getClientTypeWithDiagnostics(
        context,
        pagingMetadata.output.pageItems.property.type,
        operation,
      ),
    );

    return diagnostics.wrap({
      ...baseServiceMethod,
      kind: "paging",
      pagingMetadata: {
        __raw: pagingMetadata,
        nextLinkSegments: nextLinkSegments?.map(
          (segment) =>
            context.__responseHeaderCache.get(segment) ??
            context.__modelPropertyCache.get(segment)!,
        ),
        continuationTokenParameterSegments: pagingMetadata.input.continuationToken?.path.map(
          (r) => context.__methodParameterCache.get(r) ?? context.__modelPropertyCache.get(r)!,
        ),
        continuationTokenResponseSegments: continuationTokenResponseSegments?.map(
          (segment) =>
            context.__responseHeaderCache.get(segment) ??
            context.__modelPropertyCache.get(segment)!,
        ),
        pageItemsSegments: baseServiceMethod.response.resultSegments,
        pageSizeParameter: findPageSizeParameter(context, baseServiceMethod.parameters),
      },
    });
  }

  // azure core paging
  const pagedMetadata = getPagedResult(context.program, operation)!;

  if (
    responseType?.__raw?.kind !== "Model" ||
    responseType.kind !== "model" ||
    !pagedMetadata.itemsProperty
  ) {
    diagnostics.add(
      createDiagnostic({
        code: "unexpected-pageable-operation-return-type",
        target: operation,
        format: {
          operationName: operation.name,
        },
      }),
    );
    // return as page method with no paging info
    return diagnostics.wrap({
      ...baseServiceMethod,
      kind: "paging",
      pagingMetadata: {
        pageSizeParameter: findPageSizeParameter(context, baseServiceMethod.parameters),
      },
    });
  }

  context.__pagedResultSet.add(responseType);

  // tcgc will let all paging method return a list of items
  baseServiceMethod.response.type = diagnostics.pipe(
    getClientTypeWithDiagnostics(context, pagedMetadata.itemsProperty.type),
  );

  baseServiceMethod.response.resultSegments = getPropertySegmentsFromModelOrParameters(
    responseType,
    (p) => p.__raw === pagedMetadata.itemsProperty,
  ) as SdkModelPropertyType[] | undefined;

  let nextLinkSegments: (SdkServiceResponseHeader | SdkModelPropertyType)[] | undefined = undefined;
  let nextLinkReInjectedParametersSegments = undefined;
  if (pagedMetadata.nextLinkProperty) {
    if (isHeader(context.program, pagedMetadata.nextLinkProperty)) {
      nextLinkSegments = baseServiceMethod.operation.responses
        .map((r) => r.headers)
        .flat()
        .filter(
          (h) =>
            h.__raw?.kind === "ModelProperty" &&
            findRootSourceProperty(h.__raw) ===
              findRootSourceProperty(pagedMetadata.nextLinkProperty!),
        );
    } else {
      nextLinkSegments = getPropertySegmentsFromModelOrParameters(
        responseType,
        (p) => p.__raw === pagedMetadata.nextLinkProperty,
      ) as SdkModelPropertyType[];
    }

    if (pagedMetadata.nextLinkProperty.type.kind === "Scalar") {
      nextLinkReInjectedParametersSegments = (
        getParameterizedNextLinkArguments(context.program, pagedMetadata.nextLinkProperty.type) ??
        []
      ).map(
        (t: ModelProperty) =>
          getPropertySegmentsFromModelOrParameters(
            baseServiceMethod.parameters,
            (p) =>
              p.__raw?.kind === "ModelProperty" &&
              findRootSourceProperty(p.__raw) === findRootSourceProperty(t),
          )!,
      );
    }
  }

  return diagnostics.wrap({
    ...baseServiceMethod,
    __raw_paged_metadata: pagedMetadata,
    kind: "paging",
    nextLinkOperation: pagedMetadata?.nextLinkOperation
      ? diagnostics.pipe(
          getSdkServiceOperation<TServiceOperation>(
            context,
            pagedMetadata.nextLinkOperation,
            baseServiceMethod.parameters,
          ),
        )
      : undefined,
    pagingMetadata: {
      __raw: pagedMetadata,
      nextLinkSegments,
      nextLinkOperation: pagedMetadata?.nextLinkOperation
        ? diagnostics.pipe(
            getSdkServiceMethod<TServiceOperation>(
              context,
              pagedMetadata.nextLinkOperation,
              client,
            ),
          )
        : undefined,
      nextLinkReInjectedParametersSegments,
      pageItemsSegments: baseServiceMethod.response.resultSegments,
      pageSizeParameter: findPageSizeParameter(context, baseServiceMethod.parameters),
    },
  });
}

function mapFirstSegmentForResultSegments(
  resultSegments: ModelProperty[] | undefined,
  response: SdkMethodResponse,
): ModelProperty[] | undefined {
  if (resultSegments === undefined || response === undefined) return undefined;
  // TCGC use Http response type as the return type
  // For implicit body response, we need to locate the first segment in the response type
  // Several cases:
  // 1. `op test(): {items, nextLink}`
  // 2. `op test(): {items, nextLink} & {a, b, c}`
  // 3. `op test(): {@bodyRoot body: {items, nextLink}}`
  const responseModel =
    response.type?.kind === "model"
      ? response.type
      : response.type?.kind === "nullable" && response.type.type.kind === "model"
        ? response.type.type
        : undefined;
  if (resultSegments.length > 0 && responseModel) {
    for (let i = 0; i < resultSegments.length; i++) {
      const segment = resultSegments[i];
      for (const property of responseModel.properties ?? []) {
        if (
          property.__raw &&
          findRootSourceProperty(property.__raw) === findRootSourceProperty(segment)
        ) {
          return [property.__raw, ...resultSegments.slice(i + 1)];
        }
      }
    }
  }
  return resultSegments;
}

export function getPropertySegmentsFromModelOrParameters(
  source: SdkModelType | SdkMethodParameter[],
  predicate: (property: SdkMethodParameter | SdkModelPropertyType) => boolean,
): (SdkMethodParameter | SdkModelPropertyType)[] | undefined {
  const queue: { model: SdkModelType; path: (SdkMethodParameter | SdkModelPropertyType)[] }[] = [];

  if (!Array.isArray(source)) {
    if (source.baseModel) {
      const baseResult = getPropertySegmentsFromModelOrParameters(source.baseModel, predicate);
      if (baseResult) return baseResult;
    }
  }

  for (const prop of Array.isArray(source) ? source : source.properties.values()) {
    if (predicate(prop)) {
      return [prop];
    }
    if (prop.type.kind === "model") {
      queue.push({ model: prop.type, path: [prop] });
    }
  }

  while (queue.length > 0) {
    const { model, path } = queue.shift()!;
    for (const prop of model.properties.values()) {
      if (predicate(prop)) {
        return path.concat(prop);
      }
      if (prop.type.kind === "model") {
        queue.push({ model: prop.type, path: path.concat(prop) });
      }
    }
  }

  return undefined;
}

function getSdkLroServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
  client: SdkClientType<TServiceOperation>,
): [SdkLroServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const metadata = getServiceMethodLroMetadata(context, operation, client)!;
  const baseServiceMethod = diagnostics.pipe(
    getSdkBasicServiceMethod<TServiceOperation>(context, operation, client),
  );

  baseServiceMethod.response.type = metadata.finalResponse?.result;
  baseServiceMethod.response.resultSegments = metadata.finalResponse?.resultSegments;

  return diagnostics.wrap({
    ...baseServiceMethod,
    kind: "lro",
    __raw_lro_metadata: metadata.__raw,
    lroMetadata: metadata,
    operation: diagnostics.pipe(
      getSdkServiceOperation<TServiceOperation>(
        context,
        metadata.__raw.operation,
        baseServiceMethod.parameters,
      ),
    ),
  });
}

function getServiceMethodLroMetadata<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
  client: SdkClientType<TServiceOperation>,
): SdkLroServiceMetadata | undefined {
  const rawMetadata = getLroMetadata(context.program, operation);
  if (rawMetadata === undefined) {
    return undefined;
  }

  let finalEnvelopeResult: SdkModelType | "void" | undefined = undefined;
  const diagnostics = createDiagnosticCollector();
  if (rawMetadata.finalEnvelopeResult === "void") {
    finalEnvelopeResult = "void";
  } else if (rawMetadata.finalEnvelopeResult) {
    finalEnvelopeResult = getSdkModel(context, rawMetadata.finalEnvelopeResult);
  }
  return {
    __raw: rawMetadata,
    finalStateVia: rawMetadata.finalStateVia,
    finalResponse: getFinalResponse(),
    finalStep: getSdkLroServiceFinalStep(context, rawMetadata.finalStep),
    pollingStep: {
      responseBody: diagnostics.pipe(
        getClientTypeWithDiagnostics(context, rawMetadata.pollingInfo.responseModel),
      ) as SdkModelType,
    },
    operation: ignoreDiagnostics(getSdkBasicServiceMethod(context, rawMetadata.operation, client))
      .operation,
    logicalResult: getSdkModel(context, rawMetadata.logicalResult),
    statusMonitorStep: getStatusMonitorStep(context, rawMetadata.statusMonitorStep),
    pollingInfo: getPollingInfo(context, rawMetadata.pollingInfo),
    envelopeResult: getSdkModel(context, rawMetadata.envelopeResult),
    logicalPath: rawMetadata.logicalPath,
    finalEnvelopeResult,
    finalResultPath: rawMetadata.finalResultPath,
  };

  function getSdkLroServiceFinalStep(
    context: TCGCContext,
    step: FinalOperationStep | undefined,
  ): SdkLroServiceFinalStep | undefined {
    if (!step) return undefined;
    switch (step.kind) {
      case "finalOperationLink": {
        return {
          kind: "finalOperationLink",
          target: getSdkOperationLink(context, step.target),
        };
      }
      case "finalOperationReference": {
        return {
          kind: "finalOperationReference",
          target: getSdkOperationReference(context, step.target, client),
        };
      }
      case "pollingSuccessProperty": {
        return {
          kind: "pollingSuccessProperty",
          responseModel: getSdkModel(context, step.responseModel),
          target: ignoreDiagnostics(getSdkModelPropertyType(context, step.target)),
          sourceProperty: step.sourceProperty
            ? ignoreDiagnostics(getSdkModelPropertyType(context, step.sourceProperty))
            : undefined,
        };
      }
      case "noPollingResult": {
        return {
          kind: "noPollingResult",
          responseModel: undefined,
        };
      }
    }
  }

  function getStatusMonitorStep(
    context: TCGCContext,
    statusMonitorStep: NextOperationLink | NextOperationReference | undefined,
  ): SdkNextOperationLink | SdkNextOperationReference | undefined {
    if (!statusMonitorStep) return undefined;
    if (statusMonitorStep.kind === "nextOperationLink") {
      return {
        kind: "nextOperationLink",
        responseModel: getSdkModel(context, statusMonitorStep.responseModel),
        target: getSdkOperationLink(context, statusMonitorStep.target),
      };
    }
    return {
      kind: "nextOperationReference",
      responseModel: getSdkModel(context, statusMonitorStep.responseModel),
      target: getSdkOperationReference(context, statusMonitorStep.target, client),
    };
  }

  function getSdkOperationLink(context: TCGCContext, link: OperationLink): SdkOperationLink {
    return {
      kind: "link",
      location: link.location,
      property: ignoreDiagnostics(getSdkModelPropertyType(context, link.property)),
    };
  }

  function getSdkOperationReference<TServiceOperation extends SdkServiceOperation>(
    context: TCGCContext,
    reference: OperationReference,
    client: SdkClientType<TServiceOperation>,
  ): SdkOperationReference {
    const parameters: Map<string, SdkPropertyMap> = new Map();
    for (const [key, p] of reference.parameters?.entries() ?? []) {
      parameters.set(key, {
        sourceKind: p.sourceKind,
        source: ignoreDiagnostics(getSdkModelPropertyType(context, p.source)),
        target: ignoreDiagnostics(getSdkModelPropertyType(context, p.target)),
      });
    }
    return {
      kind: "reference",
      operation: ignoreDiagnostics(getSdkBasicServiceMethod(context, reference.operation, client))
        .operation,
      parameterMap: reference.parameterMap,
      parameters,
      link: reference.link ? getSdkOperationLink(context, reference.link) : undefined,
    };
  }

  function getPollingInfo(
    context: TCGCContext,
    pollingInfo: PollingOperationStep,
  ): SdkPollingOperationStep {
    const resultProperty = pollingInfo.resultProperty
      ? ignoreDiagnostics(getSdkModelPropertyType(context, pollingInfo.resultProperty))
      : undefined;
    const errorProperty = pollingInfo.errorProperty
      ? ignoreDiagnostics(getSdkModelPropertyType(context, pollingInfo.errorProperty))
      : undefined;
    return {
      kind: "pollingOperationStep",
      responseModel: getSdkModel(context, pollingInfo.responseModel),
      terminationStatus: getTerminationStatus(context, pollingInfo.terminationStatus),
      resultProperty,
      errorProperty,
    };
  }

  function getTerminationStatus(
    context: TCGCContext,
    terminationStatus: TerminationStatus,
  ): SdkTerminationStatus {
    switch (terminationStatus.kind) {
      case "status-code":
        return terminationStatus;
      case "model-property":
        return {
          ...terminationStatus,
          property: ignoreDiagnostics(getSdkModelPropertyType(context, terminationStatus.property)),
        };
    }
  }

  function getFinalResponse(): SdkLroServiceFinalResponse | undefined {
    if (
      rawMetadata?.finalEnvelopeResult === undefined ||
      rawMetadata.finalEnvelopeResult === "void"
    ) {
      return undefined;
    }

    const envelopeResult = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, rawMetadata.finalEnvelopeResult),
    ) as SdkModelType;
    const result = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, rawMetadata.finalResult as Model),
    ) as SdkModelType;
    const resultPath = rawMetadata.finalResultPath;
    // find the property inside the envelope result using the final result path
    let sdkProperty: SdkModelPropertyType | undefined = undefined;
    for (const property of envelopeResult.properties) {
      if (property.__raw === undefined || property.kind !== "property") {
        continue;
      }
      if (property.__raw?.name === resultPath) {
        sdkProperty = property;
        break;
      }
    }

    return {
      envelopeResult,
      result,
      resultSegments: sdkProperty !== undefined ? [sdkProperty] : undefined,
    };
  }
}

function getSdkMethodResponse(
  context: TCGCContext,
  operation: Operation,
  sdkOperation: SdkServiceOperation,
  client: SdkClientType<SdkServiceOperation>,
): SdkMethodResponse {
  const responses = sdkOperation.responses;
  // TODO: put head as bool here
  const { allResponseBodies, nonBodyExists } = getAllResponseBodiesAndNonBodyExists(responses);
  const responseTypes = new Set<string>(allResponseBodies.map((x) => getHashForType(x)));
  let type: SdkType | undefined = undefined;
  if (getResponseAsBool(context, operation)) {
    type = getSdkBuiltInType(context, $(context.program).builtin.boolean);
  } else {
    if (responseTypes.size > 1) {
      // return union of all the different types
      type = {
        __raw: operation,
        kind: "union",
        access: "public",
        usage: UsageFlags.Output,
        variantTypes: allResponseBodies,
        name: createGeneratedName(context, operation, "UnionResponse"),
        isGeneratedName: true,
        namespace: client.namespace,
        crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, operation)}.UnionResponse`,
        decorators: [],
      };
    } else if (responseTypes.size === 1) {
      type = allResponseBodies[0];
    }
    if (nonBodyExists && type) {
      type = {
        kind: "nullable",
        name: createGeneratedName(context, operation, "NullableResponse"),
        crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, operation)}.NullableResponse`,
        isGeneratedName: true,
        type: type,
        decorators: [],
        access: "public",
        usage: UsageFlags.Output,
        namespace: client.namespace,
      };
    }
  }
  return {
    kind: "method",
    type,
  };
}

function getSdkBasicServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
  client: SdkClientType<TServiceOperation>,
): [SdkServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const methodParameters: SdkMethodParameter[] = [];
  // we have to calculate apiVersions first, so that the information is put
  // in __tspTypeToApiVersions before we call parameters since method wraps parameter
  const apiVersions = getAvailableApiVersions(
    context,
    operation,
    client.__raw.type ?? client.__raw.service,
  );

  let clientParams = context.__clientParametersCache.get(client.__raw);
  if (!clientParams) {
    clientParams = [];
    context.__clientParametersCache.set(client.__raw, clientParams);
  }

  const override = getOverriddenClientMethod(context, operation);
  const params = (override ?? operation).parameters.properties.values();

  for (const param of params) {
    if (isNeverOrVoidType(param.type)) continue;
    const sdkMethodParam = diagnostics.pipe(getSdkMethodParameter(context, param, operation));
    if (sdkMethodParam.onClient) {
      const operationLocation = context.getClientForOperation(operation);
      if (sdkMethodParam.isApiVersionParam) {
        if (
          !context.__clientParametersCache.get(operationLocation)?.find((x) => x.isApiVersionParam)
        ) {
          clientParams.push(sdkMethodParam);
        }
      } else if (isSubscriptionId(context, param)) {
        if (
          !context.__clientParametersCache
            .get(operationLocation)
            ?.find((x) => isSubscriptionId(context, x))
        ) {
          clientParams.push(sdkMethodParam);
        }
      }
    } else {
      methodParameters.push(sdkMethodParam);
    }
  }

  const serviceOperation = diagnostics.pipe(
    getSdkServiceOperation<TServiceOperation>(context, operation, methodParameters),
  );
  const response = getSdkMethodResponse(context, operation, serviceOperation, client);
  const name = getLibraryName(context, operation);
  return diagnostics.wrap({
    __raw: operation,
    kind: "basic",
    name,
    access: getAccess(context, operation) ?? "public",
    parameters: methodParameters,
    doc: getClientDoc(context, operation),
    summary: getSummary(context.program, operation),
    operation: serviceOperation,
    response,
    apiVersions,
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, operation),
    decorators: diagnostics.pipe(getTypeDecorators(context, operation)),
    generateConvenient: shouldGenerateConvenient(context, operation),
    generateProtocol: shouldGenerateProtocol(context, operation),
    isOverride: override !== undefined,
  });
}

function getSdkServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
  client: SdkClientType<TServiceOperation>,
): [SdkServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const lro = getLroMetadata(context.program, operation);
  const paging = getPagedResult(context.program, operation) || isList(context.program, operation);
  if (lro && paging) {
    return getSdkLroPagingServiceMethod<TServiceOperation>(context, operation, client);
  } else if (paging) {
    return getSdkPagingServiceMethod<TServiceOperation>(context, operation, client);
  } else if (lro) {
    return getSdkLroServiceMethod<TServiceOperation>(context, operation, client);
  }
  return getSdkBasicServiceMethod<TServiceOperation>(context, operation, client);
}

export function getSdkMethodParameter(
  context: TCGCContext,
  type: ModelProperty,
  operation?: Operation,
): [SdkMethodParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  let property = context.__methodParameterCache?.get(type);

  if (!property) {
    if (operation) {
      const clientParams = operation
        ? context.__clientParametersCache.get(context.getClientForOperation(operation))
        : undefined;
      const correspondingClientParams = clientParams?.find((x) =>
        twoParamsEquivalent(context, x.__raw, type),
      );
      if (correspondingClientParams) return diagnostics.wrap(correspondingClientParams);
    }

    property = {
      ...diagnostics.pipe(getSdkModelPropertyTypeBase(context, type, operation)),
      kind: "method",
    };

    context.__methodParameterCache.set(type, property);
  }
  return diagnostics.wrap(property);
}

export function createSdkMethods<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup,
  sdkClientType: SdkClientType<TServiceOperation>,
): [SdkMethod<TServiceOperation>[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const retval: SdkMethod<TServiceOperation>[] = [];
  for (const operation of listOperationsInOperationGroup(context, client)) {
    retval.push(
      diagnostics.pipe(getSdkServiceMethod<TServiceOperation>(context, operation, sdkClientType)),
    );
  }
  for (const operationGroup of listOperationGroups(context, client)) {
    const operationGroupClient = diagnostics.pipe(
      createSdkClientType<TServiceOperation>(context, operationGroup, sdkClientType),
    );
    if (sdkClientType.children) {
      sdkClientType.children.push(operationGroupClient);
    } else {
      sdkClientType.children = [operationGroupClient];
    }
  }
  return diagnostics.wrap(retval);
}

/**
 * Helper function to find the page size parameter in a list of method parameters.
 * @param context - The TCGC context
 * @param parameters - Array of method parameters to search
 * @returns The parameter marked with @pageSize decorator, or undefined if none found
 */
function findPageSizeParameter(
  context: TCGCContext,
  parameters: SdkMethodParameter[],
): SdkMethodParameter | undefined {
  // Look for a parameter that has the @pageSize decorator
  for (const param of parameters) {
    if (param.__raw && hasPageSizeDecorator(context, param.__raw)) {
      return param;
    }
  }
  return undefined;
}

/**
 * Check if a ModelProperty has the @pageSize decorator.
 * @param context - The TCGC context
 * @param property - The model property to check
 * @returns True if the property has the @pageSize decorator
 */
function hasPageSizeDecorator(context: TCGCContext, property: ModelProperty): boolean {
  try {
    // Check if the property has decorators
    if (!property.decorators || property.decorators.length === 0) {
      return false;
    }
    
    // Look for the pageSize decorator in the property's decorators
    return property.decorators.some(decorator => {
      // The decorator could be named "pageSize" or have a full namespace like "TypeSpec.pageSize"
      const decoratorName = decorator.decorator.name;
      return decoratorName === "pageSize" || 
             decoratorName.endsWith(".pageSize") ||
             decoratorName === "TypeSpec.pageSize";
    });
  } catch (error) {
    // If there's any error accessing decorators, return false to be safe
    return false;
  }
}
