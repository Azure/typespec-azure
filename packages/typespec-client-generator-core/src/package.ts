import { getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import {
  Diagnostic,
  Operation,
  Type,
  createDiagnosticCollector,
  getNamespaceFullName,
  getService,
  ignoreDiagnostics,
} from "@typespec/compiler";
import { getServers } from "@typespec/http";
import { resolveVersions } from "@typespec/versioning";
import { camelCase } from "change-case";
import {
  getAccess,
  getClientNameOverride,
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
  SdkContext,
  SdkEndpointParameter,
  SdkEndpointType,
  SdkEnumType,
  SdkInitializationType,
  SdkLroPagingServiceMethod,
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
  UsageFlags,
} from "./interfaces.js";
import {
  TCGCContext,
  createGeneratedName,
  filterApiVersionsWithDecorators,
  getAllResponseBodiesAndNonBodyExists,
  getAvailableApiVersions,
  getClientNamespaceStringHelper,
  getDocHelper,
  getHashForType,
  getLocationOfOperation,
  getTypeDecorators,
  isNeverOrVoidType,
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
  getAllModelsWithDiagnostics,
  getClientTypeWithDiagnostics,
  getSdkCredentialParameter,
  getSdkModelPropertyType,
} from "./types.js";

function getSdkServiceOperation<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation,
  methodParameters: SdkMethodParameter[]
): [TServiceOperation, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const httpOperation = getHttpOperationWithCache(context, operation);
  if (httpOperation) {
    const sdkHttpOperation = diagnostics.pipe(
      getSdkHttpOperation(context, httpOperation, methodParameters)
    ) as TServiceOperation;
    return diagnostics.wrap(sdkHttpOperation);
  }
  diagnostics.add(
    createDiagnostic({
      code: "unsupported-protocol",
      target: operation,
      format: {},
    })
  );
  return diagnostics.wrap(undefined as any);
}
function getSdkLroPagingServiceMethod<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation
): [SdkLroPagingServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkLroServiceMethod<TOptions, TServiceOperation>(context, operation)),
    ...diagnostics.pipe(getSdkPagingServiceMethod<TOptions, TServiceOperation>(context, operation)),
    kind: "lropaging",
  });
}

function getSdkPagingServiceMethod<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation
): [SdkPagingServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const pagedMetadata = getPagedResult(context.program, operation)!;
  const basic = diagnostics.pipe(
    getSdkBasicServiceMethod<TOptions, TServiceOperation>(context, operation)
  );
  if (pagedMetadata.itemsProperty) {
    basic.response.type = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, pagedMetadata.itemsProperty.type)
    );
  }
  basic.response.resultPath = pagedMetadata.itemsSegments?.join(".");
  return diagnostics.wrap({
    ...basic,
    __raw_paged_metadata: pagedMetadata,
    kind: "paging",
    nextLinkPath: pagedMetadata?.nextLinkSegments?.join("."),
    nextLinkOperation: pagedMetadata?.nextLinkOperation
      ? diagnostics.pipe(
          getSdkServiceOperation<TOptions, TServiceOperation>(
            context,
            pagedMetadata.nextLinkOperation,
            basic.parameters
          )
        )
      : undefined,
    getResponseMapping(): string | undefined {
      return basic.response.resultPath;
    },
  });
}

function getSdkLroServiceMethod<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation
): [SdkLroServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const metadata = getLroMetadata(context.program, operation)!;
  const basicServiceMethod = diagnostics.pipe(
    getSdkBasicServiceMethod<TOptions, TServiceOperation>(context, operation)
  );

  if (metadata.finalResult === undefined || metadata.finalResult === "void") {
    basicServiceMethod.response.type = undefined;
  } else {
    basicServiceMethod.response.type = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, metadata.finalResult)
    );
  }

  basicServiceMethod.response.resultPath = metadata.finalResultPath;

  return diagnostics.wrap({
    ...basicServiceMethod,
    kind: "lro",
    __raw_lro_metadata: metadata,
    operation: diagnostics.pipe(
      getSdkServiceOperation<TOptions, TServiceOperation>(
        context,
        metadata.operation,
        basicServiceMethod.parameters
      )
    ),
    getResponseMapping(): string | undefined {
      return this.response.resultPath;
    },
  });
}

function getSdkMethodResponse<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation,
  sdkOperation: SdkServiceOperation
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
      values: allResponseBodies,
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

function getSdkBasicServiceMethod<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation
): [SdkServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const methodParameters: SdkMethodParameter[] = [];
  // we have to calculate apiVersions first, so that the information is put
  // in __tspTypeToApiVersions before we call parameters since method wraps parameter
  const apiVersions = getAvailableApiVersions(
    context,
    operation,
    getLocationOfOperation(operation)
  );

  for (const param of operation.parameters.properties.values()) {
    if (isNeverOrVoidType(param.type)) continue;
    methodParameters.push(diagnostics.pipe(getSdkMethodParameter(context, param, operation)));
  }

  const serviceOperation = diagnostics.pipe(
    getSdkServiceOperation<TOptions, TServiceOperation>(context, operation, methodParameters)
  );
  const response = getSdkMethodResponse(context, operation, serviceOperation);
  const name = getLibraryName(context, operation);
  return diagnostics.wrap({
    __raw: operation,
    kind: "basic",
    name,
    access: getAccess(context, operation),
    parameters: methodParameters,
    description: getDocHelper(context, operation).description,
    details: getDocHelper(context, operation).details,
    operation: serviceOperation,
    response,
    apiVersions,
    getParameterMapping: function getParameterMapping(
      serviceParam: SdkServiceParameter
    ): SdkModelPropertyType[] {
      return ignoreDiagnostics(
        getCorrespondingMethodParams(context, operation, methodParameters, serviceParam)
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

function getSdkServiceMethod<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation
): [SdkServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const lro = getLroMetadata(context.program, operation);
  const paging = getPagedResult(context.program, operation);
  if (lro && paging) {
    return getSdkLroPagingServiceMethod<TOptions, TServiceOperation>(context, operation);
  } else if (paging) {
    return getSdkPagingServiceMethod<TOptions, TServiceOperation>(context, operation);
  } else if (lro) {
    return getSdkLroServiceMethod<TOptions, TServiceOperation>(context, operation);
  }
  return getSdkBasicServiceMethod<TOptions, TServiceOperation>(context, operation);
}

function getClientDefaultApiVersion<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  client: SdkClient | SdkOperationGroup
): string | undefined {
  if (context.apiVersion && !["latest", "all"].includes(context.apiVersion)) {
    return context.apiVersion;
  }
  let defaultVersion = getDefaultApiVersion(context, client.service)?.value;
  if (!defaultVersion) {
    // eslint-disable-next-line deprecation/deprecation
    defaultVersion = getService(context.program, client.service)?.version;
  }
  return defaultVersion;
}

function getSdkInitializationType<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  client: SdkClient | SdkOperationGroup
): [SdkInitializationType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const credentialParam = getSdkCredentialParameter(context, client);
  const properties: SdkParameter[] = [
    diagnostics.pipe(getSdkEndpointParameter(context, client)), // there will always be an endpoint parameter
  ];
  if (credentialParam) {
    properties.push(credentialParam);
  }
  let apiVersionParam = context.__namespaceToApiVersionParameter.get(client.type);
  if (!apiVersionParam) {
    for (const operationGroup of listOperationGroups(context, client)) {
      // if any sub operation groups have an api version param, the top level needs
      // the api version param as well
      apiVersionParam = context.__namespaceToApiVersionParameter.get(operationGroup.type);
      if (apiVersionParam) break;
    }
  }
  if (apiVersionParam) {
    properties.push(apiVersionParam);
  }
  if (context.__subscriptionIdParameter) {
    properties.push(context.__subscriptionIdParameter);
  }
  const namePrefix = client.kind === "SdkClient" ? client.name : client.groupPath;
  const name = `${namePrefix.split(".").at(-1)}Options`;
  return diagnostics.wrap({
    __raw: client.service,
    description: "Initialization class for the client",
    kind: "model",
    properties,
    name,
    isGeneratedName: true,
    access: client.kind === "SdkClient" ? "public" : "internal",
    usage: UsageFlags.Input,
    crossLanguageDefinitionId: `${getNamespaceFullName(client.service.namespace!)}.${name}`,
    apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
    isFormDataType: false,
    isError: false,
    decorators: [],
  });
}

function getSdkMethodParameter(
  context: TCGCContext,
  type: Type,
  operation: Operation
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
      description: getDocHelper(context, type).description,
      details: getDocHelper(context, type).details,
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

function getSdkMethods<TOptions extends object, TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TOptions, TServiceOperation>,
  client: SdkClient | SdkOperationGroup
): [SdkMethod<TServiceOperation>[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const retval: SdkMethod<TServiceOperation>[] = [];
  for (const operation of listOperationsInOperationGroup(context, client)) {
    retval.push(
      diagnostics.pipe(getSdkServiceMethod<TOptions, TServiceOperation>(context, operation))
    );
  }
  for (const operationGroup of listOperationGroups(context, client)) {
    // We create a client accessor for each operation group
    const operationGroupClient = diagnostics.pipe(createSdkClientType(context, operationGroup));
    const name = `get${operationGroup.type.name}`;
    retval.push({
      kind: "clientaccessor",
      parameters: [],
      name,
      description: getDocHelper(context, operationGroup.type).description,
      details: getDocHelper(context, operationGroup.type).details,
      access: "internal",
      response: operationGroupClient,
      apiVersions: getAvailableApiVersions(context, operationGroup.type, client.type),
      crossLanguageDefintionId: getCrossLanguageDefinitionId(context, operationGroup.type),
      decorators: [],
    });
  }
  return diagnostics.wrap(retval);
}

function getSdkEndpointParameter(
  context: TCGCContext,
  client: SdkClient | SdkOperationGroup
): [SdkEndpointParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const servers = getServers(context.program, client.service);
  let type: SdkEndpointType;
  let optional: boolean = false;
  if (servers === undefined || servers.length > 1) {
    // if there is no defined server url, or if there are more than one
    // we will return a mandatory endpoint parameter in initialization
    const name = "endpoint";
    type = {
      kind: "endpoint",
      serverUrl: "{endpoint}",
      templateArguments: [
        {
          name,
          isGeneratedName: true,
          description: "Service host",
          kind: "path",
          onClient: true,
          urlEncode: false,
          optional: false,
          serializedName: "endpoint",
          correspondingMethodParams: [],
          type: {
            kind: "string",
            encode: "string",
            decorators: [],
          },
          isApiVersionParam: false,
          apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
          crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, client.service)}.endpoint`,
          decorators: [],
        },
      ],
      decorators: [],
    };
  } else {
    // this means we have one server
    const templateArguments: SdkPathParameter[] = [];
    type = {
      kind: "endpoint",
      serverUrl: servers[0].url,
      templateArguments,
      decorators: [],
    };
    for (const param of servers[0].parameters.values()) {
      const sdkParam = diagnostics.pipe(getSdkHttpParameter(context, param, undefined, "path"));
      if (sdkParam.kind === "path") {
        templateArguments.push(sdkParam);
        sdkParam.description = sdkParam.description ?? servers[0].description;
        sdkParam.onClient = true;
        const apiVersionInfo = updateWithApiVersionInformation(context, param, client.type);
        sdkParam.clientDefaultValue = apiVersionInfo.clientDefaultValue;
        sdkParam.isApiVersionParam = apiVersionInfo.isApiVersionParam;
        sdkParam.apiVersions = getAvailableApiVersions(context, param, client.type);
      } else {
        diagnostics.add(
          createDiagnostic({
            code: "server-param-not-path",
            target: param,
            format: {
              templateArgumentName: sdkParam.name,
              templateArgumentType: sdkParam.kind,
            },
          })
        );
      }
    }
    optional = Boolean(servers[0].url.length && templateArguments.every((param) => param.optional));
  }
  return diagnostics.wrap({
    kind: "endpoint",
    type,
    name: "endpoint",
    isGeneratedName: true,
    description: "Service host",
    onClient: true,
    urlEncode: false,
    apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
    optional,
    isApiVersionParam: false,
    crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, client.service)}.endpoint`,
    decorators: [],
  });
}

function createSdkClientType<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  client: SdkClient | SdkOperationGroup
): [SdkClientType<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const isClient = client.kind === "SdkClient";
  let name = "";
  if (isClient) {
    name = client.name;
  } else {
    name = getClientNameOverride(context, client.type) ?? client.type.name;
  }
  // NOTE: getSdkMethods recursively calls createSdkClientType
  const methods = diagnostics.pipe(getSdkMethods(context, client));
  const docWrapper = getDocHelper(context, client.type);
  const sdkClientType: SdkClientType<TServiceOperation> = {
    kind: "client",
    name,
    description: docWrapper.description,
    details: docWrapper.details,
    methods: methods,
    apiVersions: context.__tspTypeToApiVersions.get(client.type)!,
    nameSpace: getClientNamespaceStringHelper(context, client.service)!,
    initialization: diagnostics.pipe(
      getSdkInitializationType<TOptions, TServiceOperation>(context, client)
    ), // MUST call this after getSdkMethods has been called
    // eslint-disable-next-line deprecation/deprecation
    arm: client.kind === "SdkClient" ? client.arm : false,
    decorators: diagnostics.pipe(getTypeDecorators(context, client.type)),
  };
  return diagnostics.wrap(sdkClientType);
}

function populateApiVersionInformation(context: SdkContext): void {
  for (const client of listClients(context)) {
    let clientApiVersions = resolveVersions(context.program, client.service)
      .filter((x) => x.rootVersion)
      .map((x) => x.rootVersion!.value);
    context.__tspTypeToApiVersions.set(
      client.type,
      filterApiVersionsWithDecorators(context, client.type, clientApiVersions)
    );

    context.__namespaceToApiVersionClientDefaultValue.set(
      client.type,
      getClientDefaultApiVersion(context, client)
    );
    for (const og of listOperationGroups(context, client)) {
      clientApiVersions = resolveVersions(context.program, og.service)
        .filter((x) => x.rootVersion)
        .map((x) => x.rootVersion!.value);
      context.__tspTypeToApiVersions.set(
        og.type,
        filterApiVersionsWithDecorators(context, og.type, clientApiVersions)
      );

      context.__namespaceToApiVersionClientDefaultValue.set(
        og.type,
        getClientDefaultApiVersion(context, og)
      );
    }
  }
}

export function getSdkPackage<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(context: SdkContext<TOptions, TServiceOperation>): SdkPackage<TServiceOperation> {
  const diagnostics = createDiagnosticCollector();
  populateApiVersionInformation(context);
  const modelsAndEnums = diagnostics.pipe(getAllModelsWithDiagnostics(context));
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  return {
    name: getClientNamespaceString(context)!,
    rootNamespace: getClientNamespaceString(context)!,
    clients: listClients(context).map((c) => diagnostics.pipe(createSdkClientType(context, c))),
    models: modelsAndEnums.filter((x): x is SdkModelType => x.kind === "model"),
    enums: modelsAndEnums.filter((x): x is SdkEnumType => x.kind === "enum"),
    diagnostics: diagnostics.diagnostics,
    crossLanguagePackageId,
  };
}
