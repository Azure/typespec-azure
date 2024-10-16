import { getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  Diagnostic,
  getDoc,
  getNamespaceFullName,
  getService,
  getSummary,
  ignoreDiagnostics,
  Model,
  Operation,
  Type,
} from "@typespec/compiler";
import { getServers, HttpServer } from "@typespec/http";
import { resolveVersions } from "@typespec/versioning";
import { camelCase } from "change-case";
import {
  getAccess,
  getClientInitialization,
  getClientNameOverride,
  getOverriddenClientMethod,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldGenerateConvenient,
  shouldGenerateProtocol,
} from "./decorators.js";
import { getCorrespondingMethodParams, getSdkHttpOperation, getSdkHttpParameter } from "./http.js";
import {
  SdkClient,
  SdkClientType,
  SdkEndpointParameter,
  SdkEndpointType,
  SdkEnumType,
  SdkHttpOperation,
  SdkInitializationType,
  SdkLroPagingServiceMethod,
  SdkLroServiceMetadata,
  SdkLroServiceMethod,
  SdkMethod,
  SdkMethodParameter,
  SdkMethodResponse,
  SdkModelPropertyType,
  SdkModelType,
  SdkOperationGroup,
  SdkPackage,
  SdkPagingServiceMethod,
  SdkParameter,
  SdkPathParameter,
  SdkServiceMethod,
  SdkServiceOperation,
  SdkServiceParameter,
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
  getAllModelsWithDiagnostics,
  getClientTypeWithDiagnostics,
  getSdkCredentialParameter,
  getSdkModelPropertyType,
  getTypeSpecBuiltInType,
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
): [SdkLroPagingServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkLroServiceMethod<TServiceOperation>(context, operation)),
    ...diagnostics.pipe(getSdkPagingServiceMethod<TServiceOperation>(context, operation)),
    kind: "lropaging",
  });
}

function getSdkPagingServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
): [SdkPagingServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const pagedMetadata = getPagedResult(context.program, operation)!;
  const basic = diagnostics.pipe(getSdkBasicServiceMethod<TServiceOperation>(context, operation));
  if (pagedMetadata.itemsProperty) {
    basic.response.type = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, pagedMetadata.itemsProperty.type),
    );
  }
  basic.response.resultPath = getPathFromSegment(
    context,
    pagedMetadata.modelType,
    pagedMetadata.itemsSegments,
  );
  return diagnostics.wrap({
    ...basic,
    __raw_paged_metadata: pagedMetadata,
    kind: "paging",
    nextLinkPath: getPathFromSegment(
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

function getPathFromSegment(context: TCGCContext, type: Model, segments?: string[]): string {
  if (!segments || segments.length === 0) {
    return "";
  }
  const wireSegments = [];
  let current = type;
  for (const segment of segments) {
    const property = current.properties.get(segment);
    if (!property) {
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
): [SdkLroServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const metadata = getServiceMethodLroMetadata(context, operation)!;
  const basicServiceMethod = diagnostics.pipe(
    getSdkBasicServiceMethod<TServiceOperation>(context, operation),
  );

  basicServiceMethod.response.type = metadata.finalResponse?.result;

  basicServiceMethod.response.resultPath = metadata.finalResponse?.resultPath;

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
    finalResponse:
      rawMetadata.finalEnvelopeResult !== undefined && rawMetadata.finalEnvelopeResult !== "void"
        ? {
            envelopeResult: diagnostics.pipe(
              getClientTypeWithDiagnostics(context, rawMetadata.finalEnvelopeResult),
            ) as SdkModelType,
            result: diagnostics.pipe(
              getClientTypeWithDiagnostics(context, rawMetadata.finalResult as Model),
            ) as SdkModelType,
            resultPath: rawMetadata.finalResultPath,
          }
        : undefined,
    finalStep:
      rawMetadata.finalStep !== undefined ? { kind: rawMetadata.finalStep.kind } : undefined,
    pollingStep: {
      responseBody: diagnostics.pipe(
        getClientTypeWithDiagnostics(context, rawMetadata.pollingInfo.responseModel),
      ) as SdkModelType,
    },
  };
}

function getSdkMethodResponse(
  context: TCGCContext,
  operation: Operation,
  sdkOperation: SdkServiceOperation,
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
      variantTypes: allResponseBodies,
      name: createGeneratedName(context, operation, "UnionResponse"),
      isGeneratedName: true,
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, operation),
      decorators: [],
    };
  } else if (responseTypes.size === 1) {
    type = allResponseBodies[0];
  }
  if (nonBodyExists && type) {
    type = {
      kind: "nullable",
      type: type,
      decorators: [],
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
  const response = getSdkMethodResponse(context, operation, serviceOperation);
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
    getParameterMapping: function getParameterMapping(
      serviceParam: SdkServiceParameter,
    ): SdkModelPropertyType[] {
      return ignoreDiagnostics(
        getCorrespondingMethodParams(context, operation, methodParameters, serviceParam),
      );
    },
    getResponseMapping: function getResponseMapping(): string | undefined {
      return undefined; // currently we only return a value for paging or lro
    },
    crossLanguageDefintionId: getCrossLanguageDefinitionId(context, operation),
    decorators: diagnostics.pipe(getTypeDecorators(context, operation)),
    generateConvenient: shouldGenerateConvenient(context, operation),
    generateProtocol: shouldGenerateProtocol(context, operation),
  });
}

function getSdkServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: TCGCContext,
  operation: Operation,
): [SdkServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const lro = getLroMetadata(context.program, operation);
  const paging = getPagedResult(context.program, operation);
  if (lro && paging) {
    return getSdkLroPagingServiceMethod<TServiceOperation>(context, operation);
  } else if (paging) {
    return getSdkPagingServiceMethod<TServiceOperation>(context, operation);
  } else if (lro) {
    return getSdkLroServiceMethod<TServiceOperation>(context, operation);
  }
  return getSdkBasicServiceMethod<TServiceOperation>(context, operation);
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
  let initializationModel = getClientInitialization(context, client.type);
  let clientParams = context.__clientToParameters.get(client.type);
  if (!clientParams) {
    clientParams = [];
    context.__clientToParameters.set(client.type, clientParams);
  }
  const access = client.kind === "SdkClient" ? "public" : "internal";
  if (initializationModel) {
    for (const prop of initializationModel.properties) {
      clientParams.push(prop);
    }
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
      apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
      decorators: [],
    };
  }

  return diagnostics.wrap(initializationModel);
}

function getSdkMethodParameter(
  context: TCGCContext,
  type: Type,
  operation: Operation,
): [SdkMethodParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (type.kind !== "ModelProperty") {
    const libraryName = getLibraryName(context, type);
    const name = camelCase(libraryName ?? "body");
    // call before creating property type, so we can pass apiVersions of param onto its type
    const apiVersions = getAvailableApiVersions(context, type, operation);
    const propertyType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type, operation));
    return diagnostics.wrap({
      kind: "method",
      doc: getDoc(context.program, type),
      summary: getSummary(context.program, type),
      apiVersions,
      type: propertyType,
      name,
      isGeneratedName: Boolean(libraryName),
      optional: false,
      discriminator: false,
      serializedName: name,
      isApiVersionParam: false,
      onClient: false,
      crossLanguageDefinitionId: "anonymous",
      decorators: diagnostics.pipe(getTypeDecorators(context, type)),
    });
  }
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
    retval.push(diagnostics.pipe(getSdkServiceMethod<TServiceOperation>(context, operation)));
  }
  for (const operationGroup of listOperationGroups(context, client)) {
    // We create a client accessor for each operation group
    const operationGroupClient = diagnostics.pipe(
      createSdkClientType<TServiceOperation>(context, operationGroup, sdkClientType),
    );
    const clientInitialization = getClientInitialization(context, operationGroup.type);
    const parameters: SdkParameter[] = [];
    if (clientInitialization) {
      for (const property of clientInitialization.properties) {
        parameters.push(property);
      }
    } else {
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
      crossLanguageDefintionId: getCrossLanguageDefinitionId(context, operationGroup.type),
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
      variantTypes: types,
      name: createGeneratedName(context, rawClient.service, "Endpoint"),
      isGeneratedName: true,
      crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, rawClient.service),
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
  const isClient = client.kind === "SdkClient";
  let name = "";
  if (isClient) {
    name = client.name;
  } else {
    name = getClientNameOverride(context, client.type) ?? client.type.name;
  }
  const sdkClientType: SdkClientType<TServiceOperation> = {
    __raw: client,
    kind: "client",
    name,
    doc: getDoc(context.program, client.type),
    summary: getSummary(context.program, client.type),
    methods: [],
    apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
    nameSpace: getClientNamespaceStringHelper(context, client.service)!,
    initialization: diagnostics.pipe(getSdkInitializationType(context, client)),
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
  return diagnostics.wrap(sdkClientType);
}

function addDefaultClientParameters<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(context: TCGCContext, client: SdkClientType<TServiceOperation>): void {
  const diagnostics = createDiagnosticCollector();
  // there will always be an endpoint property
  client.initialization.properties.push(diagnostics.pipe(getSdkEndpointParameter(context, client)));
  const credentialParam = getSdkCredentialParameter(context, client.__raw);
  if (credentialParam) {
    client.initialization.properties.push(credentialParam);
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
    client.initialization.properties.push(apiVersionParam);
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
    client.initialization.properties.push(subId);
  }
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
  const modelsAndEnums = diagnostics.pipe(getAllModelsWithDiagnostics(context));
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  return diagnostics.wrap({
    name: getClientNamespaceString(context)!,
    rootNamespace: getClientNamespaceString(context)!,
    clients: listClients(context).map((c) => diagnostics.pipe(createSdkClientType(context, c))),
    models: modelsAndEnums.filter((x): x is SdkModelType => x.kind === "model"),
    enums: modelsAndEnums.filter((x): x is SdkEnumType => x.kind === "enum"),
    crossLanguagePackageId,
  });
}
