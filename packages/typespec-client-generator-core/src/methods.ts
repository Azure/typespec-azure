import {
  getLroMetadata,
  getPagedResult,
  getParameterizedNextLinkArguments,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  Diagnostic,
  getSummary,
  isList,
  Model,
  ModelProperty,
  Operation,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { isHeader } from "@typespec/http";
import "@typespec/http-client/typekit";
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
  SdkBodyModelPropertyType,
  SdkClient,
  SdkClientType,
  SdkLroPagingServiceMethod,
  SdkLroServiceFinalResponse,
  SdkLroServiceMetadata,
  SdkLroServiceMethod,
  SdkMethod,
  SdkMethodParameter,
  SdkMethodResponse,
  SdkModelType,
  SdkOperationGroup,
  SdkPagingServiceMethod,
  SdkServiceMethod,
  SdkServiceOperation,
  SdkServiceResponseHeader,
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
  getLocationOfOperation,
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
    const clientPagingMetadata = $(context.program).operation.getPagingClientMetadata(
      getOverriddenClientMethod(context, operation) ?? operation,
    );

    if (
      responseType?.__raw?.kind !== "Model" ||
      responseType.kind !== "model" ||
      !clientPagingMetadata
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
        pagingMetadata: {},
      });
    }

    const resultSegments = mapFirstSegmentForResultSegments(
      clientPagingMetadata.pageItemsSegments,
      baseServiceMethod.response,
    );
    const nextLinkSegments = mapFirstSegmentForResultSegments(
      clientPagingMetadata.nextLinkSegments,
      baseServiceMethod.response,
    );
    const continuationTokenResponseSegments = mapFirstSegmentForResultSegments(
      clientPagingMetadata.continuationTokenResponseSegments,
      baseServiceMethod.response,
    );

    baseServiceMethod.response.resultSegments = resultSegments?.map(
      (resultSegment) => context.__modelPropertyCache.get(resultSegment)!,
    );

    context.__pagedResultSet.add(responseType);
    const pagingMetadata = $(context.program).operation.getPagingMetadata(operation);
    // tcgc will let all paging method return a list of items
    baseServiceMethod.response.type = diagnostics.pipe(
      getClientTypeWithDiagnostics(
        context,
        pagingMetadata!.output.pageItems.property.type,
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
        continuationTokenParameterSegments:
          clientPagingMetadata.continuationTokenParameterSegments?.map(
            (r) => context.__methodParameterCache.get(r) ?? context.__modelPropertyCache.get(r)!,
          ),
        continuationTokenResponseSegments: continuationTokenResponseSegments?.map(
          (segment) =>
            context.__responseHeaderCache.get(segment) ??
            context.__modelPropertyCache.get(segment)!,
        ),
        pageItemsSegments: baseServiceMethod.response.resultSegments,
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
      pagingMetadata: {},
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
  ) as SdkBodyModelPropertyType[] | undefined;

  let nextLinkSegments: (SdkServiceResponseHeader | SdkBodyModelPropertyType)[] | undefined =
    undefined;
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
      ) as SdkBodyModelPropertyType[];
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
    },
  });
}

function mapFirstSegmentForResultSegments(
  resultSegments: ModelProperty[] | undefined,
  response: SdkMethodResponse,
): ModelProperty[] | undefined {
  if (resultSegments === undefined || response === undefined) return undefined;
  // TCGC use Http response type as the return type
  // For implicit body response, we need to map the first segment to the derived model property
  const responseModel =
    response.type?.kind === "model"
      ? response.type
      : response.type?.kind === "nullable" && response.type.type.kind === "model"
        ? response.type.type
        : undefined;
  if (resultSegments.length > 0 && responseModel) {
    const firstSegment = resultSegments[0];
    for (const property of responseModel.properties ?? []) {
      if (property.__raw && property.__raw?.sourceProperty === firstSegment) {
        return [property.__raw, ...resultSegments.slice(1)];
      }
    }
  }
  return resultSegments;
}

export function getPropertySegmentsFromModelOrParameters(
  source: SdkModelType | SdkMethodParameter[],
  predicate: (property: SdkMethodParameter | SdkBodyModelPropertyType) => boolean,
): (SdkMethodParameter | SdkBodyModelPropertyType)[] | undefined {
  const queue: { model: SdkModelType; path: (SdkMethodParameter | SdkBodyModelPropertyType)[] }[] =
    [];

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
  const metadata = getServiceMethodLroMetadata(context, operation)!;
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

function getServiceMethodLroMetadata(
  context: TCGCContext,
  operation: Operation,
): SdkLroServiceMetadata | undefined {
  const rawMetadata = getLroMetadata(context.program, operation);
  if (rawMetadata === undefined) {
    return undefined;
  }

  const diagnostics = createDiagnosticCollector();

  return {
    __raw: rawMetadata,
    finalStateVia: rawMetadata.finalStateVia,
    finalResponse: getFinalResponse(),
    finalStep:
      rawMetadata.finalStep !== undefined ? { kind: rawMetadata.finalStep.kind } : undefined,
    pollingStep: {
      responseBody: diagnostics.pipe(
        getClientTypeWithDiagnostics(context, rawMetadata.pollingInfo.responseModel),
      ) as SdkModelType,
    },
  };

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
    let sdkProperty: SdkBodyModelPropertyType | undefined = undefined;
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
  const operationLocation = getLocationOfOperation(operation);
  const apiVersions = getAvailableApiVersions(context, operation, operationLocation);

  let clientParams = context.__clientToParameters.get(operationLocation);
  if (!clientParams) {
    clientParams = [];
    context.__clientToParameters.set(operationLocation, clientParams);
  }

  const override = getOverriddenClientMethod(context, operation);
  const params = (override ?? operation).parameters.properties.values();

  for (const param of params) {
    if (isNeverOrVoidType(param.type)) continue;
    const sdkMethodParam = diagnostics.pipe(getSdkMethodParameter(context, param, operation));
    if (sdkMethodParam.onClient) {
      const operationLocation = getLocationOfOperation(operation);
      if (sdkMethodParam.isApiVersionParam) {
        if (
          !context.__clientToParameters.get(operationLocation)?.find((x) => x.isApiVersionParam)
        ) {
          clientParams.push(sdkMethodParam);
        }
      } else if (isSubscriptionId(context, param)) {
        if (
          !context.__clientToParameters
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
        ? context.__clientToParameters.get(getLocationOfOperation(operation))
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
