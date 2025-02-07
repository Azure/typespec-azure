import { getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  Diagnostic,
  getDoc,
  getNamespaceFullName,
  getPagingOperation,
  getService,
  getSummary,
  isList,
  Model,
  ModelProperty,
  Operation,
} from "@typespec/compiler";
import { getServers, HttpServer } from "@typespec/http";
import { resolveVersions } from "@typespec/versioning";
import {
  getAccess,
  getClientInitialization,
  getClientInitializationOptions,
  getClientNamespace,
  getOverriddenClientMethod,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldGenerateConvenient,
  shouldGenerateProtocol,
} from "./decorators.js";
import { getSdkHttpOperation, getSdkHttpParameter } from "./http.js";
import {
  InitializedByFlags,
  SdkBodyModelPropertyType,
  SdkClient,
  SdkClientInitializationType,
  SdkClientType,
  SdkEndpointParameter,
  SdkEndpointType,
  SdkEnumType,
  SdkHttpOperation,
  SdkInitializationType,
  SdkLroPagingServiceMethod,
  SdkLroServiceFinalResponse,
  SdkLroServiceMetadata,
  SdkLroServiceMethod,
  SdkMethod,
  SdkMethodParameter,
  SdkMethodResponse,
  SdkModelPropertyType,
  SdkModelType,
  SdkNamespace,
  SdkNullableType,
  SdkOperationGroup,
  SdkPackage,
  SdkPagingServiceMethod,
  SdkParameter,
  SdkPathParameter,
  SdkServiceMethod,
  SdkServiceOperation,
  SdkType,
  SdkUnionType,
  TCGCContext,
  UsageFlags,
} from "./interfaces.js";
import {
  createGeneratedName,
  filterApiVersionsWithDecorators,
  getAllResponseBodiesAndNonBodyExists,
  getAvailableApiVersions,
  getClientNamespaceStringHelper,
  getHashForType,
  getLocationOfOperation,
  getTypeDecorators,
  getValueTypeValue,
  isNeverOrVoidType,
  isSubscriptionId,
  updateWithApiVersionInformation,
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
import {
  getClientNamespaceString,
  getCrossLanguageDefinitionId,
  getCrossLanguagePackageId,
  getDefaultApiVersion,
  getHttpOperationWithCache,
  getLibraryName,
} from "./public-utils.js";
import {
  addEncodeInfo,
  getAllReferencedTypes,
  getClientTypeWithDiagnostics,
  getSdkCredentialParameter,
  getSdkModelPropertyType,
  getSdkModelWithDiagnostics,
  getTypeSpecBuiltInType,
  handleAllTypes,
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

  const basic = diagnostics.pipe(
    getSdkBasicServiceMethod<TServiceOperation>(context, operation, client),
  );

  // nullable response type means the underlaying operation has multiple responses and only one of them is not empty, which is what we want
  let responseType = basic.response.type;
  if (responseType?.kind === "nullable") {
    responseType = responseType.type;
  }

  // normal paging
  if (isList(context.program, operation)) {
    const pagingOperation = diagnostics.pipe(getPagingOperation(context.program, operation));

    if (responseType?.__raw?.kind !== "Model" || !pagingOperation) {
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
        ...basic,
        kind: "paging",
      });
    }

    basic.response.resultPath = getPropertyPathFromModel(
      context,
      responseType?.__raw,
      (p) => p === pagingOperation.output.pageItems.property,
    );
    const nextLinkPath = pagingOperation.output.nextLink
      ? getPropertyPathFromModel(
          context,
          responseType?.__raw,
          (p) => p === pagingOperation.output.nextLink!.property,
        )
      : undefined;

    context.__pagedResultSet.add(responseType);
    // tcgc will let all paging method return a list of items
    basic.response.type = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, pagingOperation?.output.pageItems.property.type),
    );

    return diagnostics.wrap({
      ...basic,
      kind: "paging",
      nextLinkPath,
    });
  }

  // azure core paging
  const pagedMetadata = getPagedResult(context.program, operation)!;

  if (responseType?.__raw?.kind !== "Model" || !pagedMetadata.itemsProperty) {
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
      ...basic,
      kind: "paging",
    });
  }

  context.__pagedResultSet.add(responseType);

  // tcgc will let all paging method return a list of items
  basic.response.type = diagnostics.pipe(
    getClientTypeWithDiagnostics(context, pagedMetadata.itemsProperty.type),
  );

  basic.response.resultPath = getPropertyPathFromSegment(
    context,
    pagedMetadata.modelType,
    pagedMetadata.itemsSegments,
  );

  return diagnostics.wrap({
    ...basic,
    __raw_paged_metadata: pagedMetadata,
    kind: "paging",
    nextLinkPath: getPropertyPathFromSegment(
      context,
      pagedMetadata.modelType,
      pagedMetadata?.nextLinkSegments,
    ),
    nextLinkOperation: pagedMetadata?.nextLinkOperation
      ? diagnostics.pipe(
          getSdkServiceOperation<TServiceOperation>(
            context,
            pagedMetadata.nextLinkOperation,
            basic.parameters,
          ),
        )
      : undefined,
  });
}

export function getPropertyPathFromModel(
  context: TCGCContext,
  model: Model,
  predicate: (property: ModelProperty) => boolean,
): string | undefined {
  const queue: { model: Model; path: ModelProperty[] }[] = [];

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
  const basicServiceMethod = diagnostics.pipe(
    getSdkBasicServiceMethod<TServiceOperation>(context, operation, client),
  );

  basicServiceMethod.response.type = metadata.finalResponse?.result;

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  basicServiceMethod.response.resultPath = metadata.finalResponse?.resultPath;

  basicServiceMethod.response.resultSegments = metadata.finalResponse?.resultSegments;

  return diagnostics.wrap({
    ...basicServiceMethod,
    kind: "lro",
    __raw_lro_metadata: metadata.__raw,
    lroMetadata: metadata,
    operation: diagnostics.pipe(
      getSdkServiceOperation<TServiceOperation>(
        context,
        metadata.__raw.operation,
        basicServiceMethod.parameters,
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
      clientNamespace: client.clientNamespace,
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
      isGeneratedName: true,
      type: type,
      decorators: [],
      access: "public",
      usage: UsageFlags.Output,
      clientNamespace: client.clientNamespace,
    };
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
  // set the correct encode for body parameter according to the content-type
  if (
    serviceOperation.bodyParam &&
    serviceOperation.bodyParam.correspondingMethodParams.length === 1
  ) {
    const methodBodyParam = serviceOperation.bodyParam.correspondingMethodParams[0];
    const contentTypes = serviceOperation.__raw.parameters.body?.contentTypes;
    const defaultContentType =
      contentTypes && contentTypes.length > 0 ? contentTypes[0] : "application/json";
    diagnostics.pipe(
      addEncodeInfo(context, methodBodyParam.__raw!, methodBodyParam.type, defaultContentType),
    );
  }
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

function getClientDefaultApiVersion(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup,
): string | undefined {
  if (context.apiVersion && !["latest", "all"].includes(context.apiVersion)) {
    return context.apiVersion;
  }
  let defaultVersion = getDefaultApiVersion(context, client.service)?.value;
  if (!defaultVersion) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    defaultVersion = getService(context.program, client.service)?.version;
  }
  return defaultVersion;
}

function getSdkInitializationType(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup,
): [SdkInitializationType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  let initializationModel = getClientInitialization(context, client.type); // eslint-disable-line @typescript-eslint/no-deprecated
  const access = client.kind === "SdkClient" ? "public" : "internal";
  if (initializationModel) {
    initializationModel.access = access;
  } else {
    const namePrefix = client.kind === "SdkClient" ? client.name : client.groupPath;
    const name = `${namePrefix.split(".").at(-1)}Options`;
    initializationModel = {
      __raw: client.service,
      doc: "Initialization class for the client",
      kind: "model",
      properties: [],
      name,
      isGeneratedName: true,
      access,
      usage: UsageFlags.Input,
      crossLanguageDefinitionId: `${getNamespaceFullName(client.service.namespace!)}.${name}`,
      clientNamespace: getClientNamespace(context, client.type),
      apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
      decorators: [],
      serializationOptions: {},
    };
  }

  return diagnostics.wrap(initializationModel);
}

function createSdkClientInitializationType(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup,
): [SdkClientInitializationType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const name = `${client.kind === "SdkClient" ? client.name : client.groupPath.split(".").at(-1)}Options`;
  const result: SdkClientInitializationType = {
    kind: "clientinitialization",
    doc: "Initialization for the client",
    parameters: [],
    initializedBy:
      client.kind === "SdkClient" ? InitializedByFlags.Individually : InitializedByFlags.Parent,
    name,
    isGeneratedName: true,
    decorators: [],
  };

  // customization
  const initializationOptions = getClientInitializationOptions(context, client.type);
  if (initializationOptions?.parameters) {
    const model = diagnostics.pipe(
      getSdkModelWithDiagnostics(context, initializationOptions.parameters),
    );
    result.doc = model.doc;
    result.summary = model.summary;
    result.name = model.name;
    result.isGeneratedName = model.isGeneratedName;
    result.decorators = model.decorators;
    result.__raw = model.__raw;
    result.parameters = model.properties.map(
      (property: SdkModelPropertyType): SdkMethodParameter => {
        property.onClient = true;
        property.kind = "method";
        return property as SdkMethodParameter;
      },
    );
  }
  if (initializationOptions?.initializedBy) {
    if (
      client.kind === "SdkClient" &&
      (initializationOptions.initializedBy & InitializedByFlags.Parent) ===
        InitializedByFlags.Parent
    ) {
      diagnostics.add(
        createDiagnostic({
          code: "invalid-initialized-by",
          target: client.type,
          format: {
            message:
              "First level client must have `InitializedBy.individually` specified in `initializedBy`.",
          },
        }),
      );
    } else if (
      client.kind === "SdkOperationGroup" &&
      initializationOptions.initializedBy === InitializedByFlags.Individually
    ) {
      diagnostics.add(
        createDiagnostic({
          code: "invalid-initialized-by",
          target: client.type,
          format: {
            message:
              "Sub client must have `InitializedBy.parent` or `InitializedBy.individually | InitializedBy.parent` specified in `initializedBy`.",
          },
        }),
      );
    } else {
      result.initializedBy = initializationOptions.initializedBy;
    }
  }
  if (initializationOptions?.parameters) {
    // Cache elevated parameter, then we could use it to set `onClient` property for method parameters.
    let clientParams = context.__clientToParameters.get(client.type);
    if (!clientParams) {
      clientParams = [];
      context.__clientToParameters.set(client.type, clientParams);
    }
    for (const param of result.parameters) {
      clientParams.push(param);
    }
  }

  return diagnostics.wrap(result);
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

function getSdkMethods<TServiceOperation extends SdkServiceOperation>(
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
    // We create a client accessor for each operation group
    const operationGroupClient = diagnostics.pipe(
      createSdkClientType<TServiceOperation>(context, operationGroup, sdkClientType),
    );
    if (sdkClientType.children) {
      sdkClientType.children.push(operationGroupClient);
    } else {
      sdkClientType.children = [operationGroupClient];
    }
    const clientInitialization = getClientInitialization(context, operationGroup.type); // eslint-disable-line @typescript-eslint/no-deprecated
    const parameters: SdkParameter[] = [];
    if (clientInitialization) {
      for (const property of clientInitialization.properties) {
        parameters.push(property);
      }
    }
    const name = `get${operationGroup.type.name}`;
    retval.push({
      kind: "clientaccessor",
      parameters,
      name,
      doc: getDoc(context.program, operationGroup.type),
      summary: getSummary(context.program, operationGroup.type),
      access: "internal",
      response: operationGroupClient,
      apiVersions: getAvailableApiVersions(context, operationGroup.type, client.type),
      crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, operationGroup.type)}.${name}`,
      decorators: [],
    });
  }
  return diagnostics.wrap(retval);
}

function getEndpointTypeFromSingleServer<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  context: TCGCContext,
  client: SdkClientType<TServiceOperation>,
  server: HttpServer | undefined,
): [SdkEndpointType[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const templateArguments: SdkPathParameter[] = [];
  const defaultOverridableEndpointType: SdkEndpointType = {
    kind: "endpoint",
    serverUrl: "{endpoint}",
    templateArguments: [
      {
        name: "endpoint",
        isGeneratedName: true,
        doc: "Service host",
        kind: "path",
        onClient: true,
        urlEncode: false,
        explode: false,
        style: "simple",
        allowReserved: false,
        optional: false,
        serializedName: "endpoint",
        correspondingMethodParams: [],
        type: getTypeSpecBuiltInType(context, "string"),
        isApiVersionParam: false,
        apiVersions: context.__tspTypeToApiVersions.get(client.__raw.type)!,
        crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, client.__raw.service)}.endpoint`,
        decorators: [],
      },
    ],
    decorators: [],
  };
  const types: SdkEndpointType[] = [];
  if (!server) return diagnostics.wrap([defaultOverridableEndpointType]);
  for (const param of server.parameters.values()) {
    const sdkParam = diagnostics.pipe(
      getSdkHttpParameter(context, param, undefined, undefined, "path"),
    );
    if (sdkParam.kind === "path") {
      templateArguments.push(sdkParam);
      sdkParam.onClient = true;
      if (param.defaultValue) {
        sdkParam.clientDefaultValue = getValueTypeValue(param.defaultValue);
      }
      const apiVersionInfo = updateWithApiVersionInformation(context, param, client.__raw.type);
      sdkParam.isApiVersionParam = apiVersionInfo.isApiVersionParam;
      if (sdkParam.isApiVersionParam && apiVersionInfo.clientDefaultValue) {
        sdkParam.clientDefaultValue = apiVersionInfo.clientDefaultValue;
      }
      sdkParam.apiVersions = getAvailableApiVersions(context, param, client.__raw.type);
      sdkParam.crossLanguageDefinitionId = `${getCrossLanguageDefinitionId(context, client.__raw.service)}.${param.name}`;
    } else {
      diagnostics.add(
        createDiagnostic({
          code: "server-param-not-path",
          target: param,
          format: {
            templateArgumentName: sdkParam.name,
            templateArgumentType: sdkParam.kind,
          },
        }),
      );
    }
  }
  const isOverridable =
    templateArguments.length === 1 && server.url.startsWith("{") && server.url.endsWith("}");

  if (templateArguments.length === 0) {
    types.push(defaultOverridableEndpointType);
    types[0].templateArguments[0].clientDefaultValue = server.url;
  } else {
    types.push({
      kind: "endpoint",
      serverUrl: server.url,
      templateArguments,
      decorators: [],
    });
    if (!isOverridable) {
      types.push(defaultOverridableEndpointType);
    }
  }
  return diagnostics.wrap(types);
}

function getSdkEndpointParameter<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: TCGCContext,
  client: SdkClientType<TServiceOperation>,
): [SdkEndpointParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const rawClient = client.__raw;
  const servers = getServers(context.program, client.__raw.service);
  const types: SdkEndpointType[] = [];

  if (servers === undefined) {
    // if there is no defined server url, we will return an overridable endpoint
    types.push(...diagnostics.pipe(getEndpointTypeFromSingleServer(context, client, undefined)));
  } else {
    for (const server of servers) {
      types.push(...diagnostics.pipe(getEndpointTypeFromSingleServer(context, client, server)));
    }
  }
  let type: SdkEndpointType | SdkUnionType<SdkEndpointType>;
  if (types.length > 1) {
    type = {
      kind: "union",
      access: "public",
      usage: UsageFlags.None,
      variantTypes: types,
      name: createGeneratedName(context, rawClient.service, "Endpoint"),
      isGeneratedName: true,
      crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, rawClient.service)}.Endpoint`,
      clientNamespace: getClientNamespace(context, rawClient.service),
      decorators: [],
    } as SdkUnionType<SdkEndpointType>;
  } else {
    type = types[0];
  }
  return diagnostics.wrap({
    kind: "endpoint",
    type,
    name: "endpoint",
    isGeneratedName: true,
    doc: "Service host",
    onClient: true,
    urlEncode: false,
    apiVersions: context.__tspTypeToApiVersions.get(rawClient.type)!,
    optional: false,
    isApiVersionParam: false,
    crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, rawClient.service)}.endpoint`,
    decorators: [],
  });
}

function createSdkClientType<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup,
  parent?: SdkClientType<TServiceOperation>,
): [SdkClientType<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const sdkClientType: SdkClientType<TServiceOperation> = {
    __raw: client,
    kind: "client",
    name: client.kind === "SdkClient" ? client.name : getLibraryName(context, client.type),
    doc: getDoc(context.program, client.type),
    summary: getSummary(context.program, client.type),
    methods: [],
    apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
    nameSpace: getClientNamespaceStringHelper(context, client.service)!,
    clientNamespace: getClientNamespace(context, client.type),
    initialization: diagnostics.pipe(getSdkInitializationType(context, client)),
    clientInitialization: diagnostics.pipe(createSdkClientInitializationType(context, client)),
    decorators: diagnostics.pipe(getTypeDecorators(context, client.type)),
    parent,
    // if it is client, the crossLanguageDefinitionId is the ${namespace}, if it is operation group, the crosslanguageDefinitionId is the %{namespace}.%{operationGroupName}
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, client.type),
  };
  // NOTE: getSdkMethods recursively calls createSdkClientType
  sdkClientType.methods = diagnostics.pipe(
    getSdkMethods<TServiceOperation>(context, client, sdkClientType),
  );
  addDefaultClientParameters(context, sdkClientType);
  // update initialization model properties

  sdkClientType.initialization.properties = [...sdkClientType.clientInitialization.parameters]; // eslint-disable-line @typescript-eslint/no-deprecated
  return diagnostics.wrap(sdkClientType);
}

function addDefaultClientParameters<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(context: TCGCContext, client: SdkClientType<TServiceOperation>): void {
  const diagnostics = createDiagnosticCollector();
  const defaultClientParamters = [];
  // there will always be an endpoint property
  defaultClientParamters.push(diagnostics.pipe(getSdkEndpointParameter(context, client)));
  const credentialParam = getSdkCredentialParameter(context, client.__raw);
  if (credentialParam) {
    defaultClientParamters.push(credentialParam);
  }
  let apiVersionParam = context.__clientToParameters
    .get(client.__raw.type)
    ?.find((x) => x.isApiVersionParam);
  if (!apiVersionParam) {
    for (const operationGroup of listOperationGroups(context, client.__raw)) {
      // if any sub operation groups have an api version param, the top level needs
      // the api version param as well
      apiVersionParam = context.__clientToParameters
        .get(operationGroup.type)
        ?.find((x) => x.isApiVersionParam);
      if (apiVersionParam) break;
    }
  }
  if (apiVersionParam) {
    defaultClientParamters.push(apiVersionParam);
  }
  let subId = context.__clientToParameters
    .get(client.__raw.type)
    ?.find((x) => isSubscriptionId(context, x));
  if (!subId && context.arm) {
    for (const operationGroup of listOperationGroups(context, client.__raw)) {
      // if any sub operation groups have an subId param, the top level needs it as well
      subId = context.__clientToParameters
        .get(operationGroup.type)
        ?.find((x) => isSubscriptionId(context, x));
      if (subId) break;
    }
  }
  if (subId) {
    defaultClientParamters.push(subId);
  }
  client.clientInitialization.parameters = [
    ...defaultClientParamters,
    ...client.clientInitialization.parameters,
  ];
}

function populateApiVersionInformation(context: TCGCContext): void {
  for (const client of listClients(context)) {
    let clientApiVersions = resolveVersions(context.program, client.service)
      .filter((x) => x.rootVersion)
      .map((x) => x.rootVersion!.value);
    context.__tspTypeToApiVersions.set(
      client.type,
      filterApiVersionsWithDecorators(context, client.type, clientApiVersions),
    );

    context.__clientToApiVersionClientDefaultValue.set(
      client.type,
      getClientDefaultApiVersion(context, client),
    );
    for (const og of listOperationGroups(context, client)) {
      clientApiVersions = resolveVersions(context.program, og.service)
        .filter((x) => x.rootVersion)
        .map((x) => x.rootVersion!.value);
      context.__tspTypeToApiVersions.set(
        og.type,
        filterApiVersionsWithDecorators(context, og.type, clientApiVersions),
      );

      context.__clientToApiVersionClientDefaultValue.set(
        og.type,
        getClientDefaultApiVersion(context, og),
      );
    }
  }
}

export function getSdkPackage<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
): [SdkPackage<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  populateApiVersionInformation(context);
  diagnostics.pipe(handleAllTypes(context));
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  const allReferencedTypes = getAllReferencedTypes(context);
  const sdkPackage: SdkPackage<TServiceOperation> = {
    name: getClientNamespaceString(context)!,
    rootNamespace: getClientNamespaceString(context)!,
    clients: listClients(context).map((c) => diagnostics.pipe(createSdkClientType(context, c))),
    models: allReferencedTypes.filter((x): x is SdkModelType => x.kind === "model"),
    enums: allReferencedTypes.filter((x): x is SdkEnumType => x.kind === "enum"),
    unions: allReferencedTypes.filter(
      (x): x is SdkUnionType | SdkNullableType => x.kind === "union" || x.kind === "nullable",
    ),
    crossLanguagePackageId,
    namespaces: [],
  };
  organizeNamespaces(sdkPackage);
  return diagnostics.wrap(sdkPackage);
}

function organizeNamespaces<TServiceOperation extends SdkServiceOperation>(
  sdkPackage: SdkPackage<TServiceOperation>,
) {
  const clients = [...sdkPackage.clients];
  while (clients.length > 0) {
    const client = clients.shift()!;
    getSdkNamespace(sdkPackage, client.clientNamespace).clients.push(client);
    client.methods
      .filter((m) => m.kind === "clientaccessor")
      .map((m) => m.response)
      .map((c) => clients.push(c));
  }
  for (const model of sdkPackage.models) {
    getSdkNamespace(sdkPackage, model.clientNamespace).models.push(model);
  }
  for (const enumType of sdkPackage.enums) {
    getSdkNamespace(sdkPackage, enumType.clientNamespace).enums.push(enumType);
  }
  for (const unionType of sdkPackage.unions) {
    getSdkNamespace(sdkPackage, unionType.clientNamespace).unions.push(unionType);
  }
}

function getSdkNamespace<TServiceOperation extends SdkServiceOperation>(
  sdkPackage: SdkPackage<TServiceOperation>,
  namespace: string,
) {
  const segments = namespace.split(".");
  let current: SdkPackage<TServiceOperation> | SdkNamespace<TServiceOperation> = sdkPackage;
  let fullName = "";
  for (const segment of segments) {
    fullName = fullName === "" ? segment : `${fullName}.${segment}`;
    const ns: SdkNamespace<TServiceOperation> | undefined = current.namespaces.find(
      (ns) => ns.name === segment,
    );
    if (ns === undefined) {
      const newNs = {
        name: segment,
        fullName,
        clients: [],
        models: [],
        enums: [],
        unions: [],
        namespaces: [],
      };
      current.namespaces.push(newNs);
      current = newNs;
    } else {
      current = ns;
    }
  }
  return current;
}
