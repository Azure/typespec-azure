import {
  getLroMetadata,
  getPagedResult,
  getParameterizedNextLinkArguments,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  Diagnostic,
  getDoc,
  getPagingOperation,
  getSummary,
  isList,
  Model,
  ModelProperty,
  Operation,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
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
  SdkModelPropertyType,
  SdkModelType,
  SdkOperationGroup,
  SdkPagingServiceMethod,
  SdkServiceMethod,
  SdkServiceOperation,
  SdkType,
  TCGCContext,
  UsageFlags,
} from "./interfaces.js";
import {
  createGeneratedName,
  findRootSourceProperty,
  getAllResponseBodiesAndNonBodyExists,
  getAvailableApiVersions,
  getHashForType,
  getLocationOfOperation,
  getTypeDecorators,
  isNeverOrVoidType,
  isSubscriptionId,
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
  getSdkModelPropertyType,
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
    const pagingOperation = diagnostics.pipe(getPagingOperation(context.program, operation));

    if (
      responseType?.__raw?.kind !== "Model" ||
      responseType.kind !== "model" ||
      !pagingOperation
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

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    baseServiceMethod.response.resultPath = getPropertyPathFromModel(
      context,
      responseType?.__raw,
      (p) =>
        p.kind === "ModelProperty" &&
        findRootSourceProperty(p) ===
          findRootSourceProperty(pagingOperation.output.pageItems.property),
    );
    baseServiceMethod.response.resultSegments = getPropertySegmentsFromModelOrParameters(
      responseType,
      (p) =>
        p.__raw?.kind === "ModelProperty" &&
        findRootSourceProperty(p.__raw) ===
          findRootSourceProperty(pagingOperation.output.pageItems.property),
    );

    let nextLinkPath = undefined;
    let nextLinkSegments = undefined;
    if (pagingOperation.output.nextLink) {
      if (isHeader(context.program, pagingOperation.output.nextLink.property)) {
        nextLinkSegments = baseServiceMethod.operation.responses
          .map((r) => r.headers)
          .flat()
          .filter(
            (h) =>
              h.__raw?.kind === "ModelProperty" &&
              findRootSourceProperty(h.__raw) ===
                findRootSourceProperty(pagingOperation.output.nextLink!.property),
          );
        nextLinkPath = getLibraryName(context, nextLinkSegments[0].__raw);
      } else {
        nextLinkPath = getPropertyPathFromModel(
          context,
          responseType?.__raw,
          (p) =>
            p.kind === "ModelProperty" &&
            findRootSourceProperty(p) ===
              findRootSourceProperty(pagingOperation.output.nextLink!.property),
        );
        nextLinkSegments = getPropertySegmentsFromModelOrParameters(
          responseType,
          (p) =>
            p.__raw?.kind === "ModelProperty" &&
            findRootSourceProperty(p.__raw) ===
              findRootSourceProperty(pagingOperation.output.nextLink!.property),
        );
      }
    }

    let continuationTokenParameterSegments = undefined;
    let continuationTokenResponseSegments = undefined;
    if (pagingOperation.input.continuationToken) {
      continuationTokenParameterSegments = getPropertySegmentsFromModelOrParameters(
        baseServiceMethod.parameters,
        (p) =>
          p.__raw?.kind === "ModelProperty" &&
          findRootSourceProperty(p.__raw) ===
            findRootSourceProperty(pagingOperation.input.continuationToken!.property),
      );
    }
    if (pagingOperation.output.continuationToken) {
      if (isHeader(context.program, pagingOperation.output.continuationToken.property)) {
        continuationTokenResponseSegments = baseServiceMethod.operation.responses
          .map((r) => r.headers)
          .flat()
          .filter(
            (h) =>
              h.__raw?.kind === "ModelProperty" &&
              findRootSourceProperty(h.__raw) ===
                findRootSourceProperty(pagingOperation.output.continuationToken!.property),
          );
      } else {
        continuationTokenResponseSegments = getPropertySegmentsFromModelOrParameters(
          responseType,
          (p) =>
            p.__raw?.kind === "ModelProperty" &&
            findRootSourceProperty(p.__raw) ===
              findRootSourceProperty(pagingOperation.output.continuationToken!.property),
        );
      }
    }

    context.__pagedResultSet.add(responseType);
    // tcgc will let all paging method return a list of items
    baseServiceMethod.response.type = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, pagingOperation?.output.pageItems.property.type),
    );

    return diagnostics.wrap({
      ...baseServiceMethod,
      kind: "paging",
      nextLinkPath,
      pagingMetadata: {
        __raw: pagingOperation,
        nextLinkSegments,
        continuationTokenParameterSegments,
        continuationTokenResponseSegments,
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

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  baseServiceMethod.response.resultPath = getPropertyPathFromSegment(
    context,
    pagedMetadata.modelType,
    pagedMetadata.itemsSegments,
  );
  baseServiceMethod.response.resultSegments = getPropertySegmentsFromModelOrParameters(
    responseType,
    (p) => p.__raw === pagedMetadata.itemsProperty,
  );

  let nextLinkPath = undefined;
  let nextLinkSegments = undefined;
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
      nextLinkPath = getLibraryName(context, nextLinkSegments[0].__raw);
    } else {
      nextLinkPath = getPropertyPathFromSegment(
        context,
        pagedMetadata.modelType,
        pagedMetadata?.nextLinkSegments,
      );
      nextLinkSegments = getPropertySegmentsFromModelOrParameters(
        responseType,
        (p) => p.__raw === pagedMetadata.nextLinkProperty,
      );
    }

    if (pagedMetadata.nextLinkProperty.type.kind === "Scalar") {
      nextLinkReInjectedParametersSegments = (
        getParameterizedNextLinkArguments(context.program, pagedMetadata.nextLinkProperty.type) ||
        []
      ).map((t: ModelProperty) =>
        getPropertySegmentsFromModelOrParameters(
          baseServiceMethod.parameters,
          (p) =>
            p.__raw?.kind === "ModelProperty" &&
            findRootSourceProperty(p.__raw) === findRootSourceProperty(t),
        ),
      );
    }
  }

  return diagnostics.wrap({
    ...baseServiceMethod,
    __raw_paged_metadata: pagedMetadata,
    kind: "paging",
    nextLinkPath,
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

export function getPropertyPathFromModel(
  context: TCGCContext,
  model: Model,
  predicate: (property: ModelProperty) => boolean,
): string | undefined {
  const queue: { model: Model; path: ModelProperty[] }[] = [];

  if (model.baseModel) {
    const baseResult = getPropertyPathFromModel(context, model.baseModel, predicate);
    if (baseResult) return baseResult;
  }

  for (const prop of model.properties.values()) {
    if (predicate(prop)) {
      return getLibraryName(context, prop);
    }
    if (prop.type.kind === "Model") {
      queue.push({ model: prop.type, path: [prop] });
    }
  }

  while (queue.length > 0) {
    const { model, path } = queue.shift()!;
    for (const prop of model.properties.values()) {
      if (predicate(prop)) {
        return path
          .concat(prop)
          .map((s) => getLibraryName(context, s))
          .join(".");
      }
      if (prop.type.kind === "Model") {
        queue.push({ model: prop.type, path: path.concat(prop) });
      }
    }
  }

  return undefined;
}

export function getPropertySegmentsFromModelOrParameters(
  source: SdkModelType | SdkMethodParameter[],
  predicate: (property: SdkModelPropertyType) => boolean,
): SdkModelPropertyType[] | undefined {
  const queue: { model: SdkModelType; path: SdkModelPropertyType[] }[] = [];

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

function getPropertyPathFromSegment(
  context: TCGCContext,
  type: Model,
  segments?: string[],
): string {
  if (!segments || segments.length === 0) {
    return "";
  }
  const wireSegments = [];
  let current = type;
  for (const segment of segments) {
    const property = current.properties.get(segment);
    if (!property) {
      if (current.baseModel) {
        return getPropertyPathFromSegment(context, current.baseModel, segments);
      }
      return "";
    }
    wireSegments.push(getLibraryName(context, property));
    current = property.type as Model;
  }
  return wireSegments.join(".");
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

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  baseServiceMethod.response.resultPath = metadata.finalResponse?.resultPath;
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
      resultPath,
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
    type = getSdkBuiltInType(context, $.builtin.boolean);
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
    doc: getDoc(context.program, operation),
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

function getSdkMethodParameter(
  context: TCGCContext,
  type: ModelProperty,
  operation: Operation,
): [SdkMethodParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkModelPropertyType(context, type, operation)),
    kind: "method",
  });
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
    // skip if there is no operation or sub-client
    if (operationGroupClient.methods.length === 0 && (!operationGroupClient.children || operationGroupClient.children.length === 0)) {
      continue;
    }
    if (sdkClientType.children) {
      sdkClientType.children.push(operationGroupClient);
    } else {
      sdkClientType.children = [operationGroupClient];
    }
  }
  return diagnostics.wrap(retval);
}
