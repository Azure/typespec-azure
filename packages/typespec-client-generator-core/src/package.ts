import { getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import {
  Operation,
  Type,
  UsageFlags,
  getNamespaceFullName,
  ignoreDiagnostics,
} from "@typespec/compiler";
import { HttpOperation, getHeaderFieldName, getHttpOperation, getServers, isContentTypeHeader } from "@typespec/http";
import { resolveVersions } from "@typespec/versioning";
import {
  getAccess,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
} from "./decorators.js";
import {
  SdkBodyModelPropertyType,
  SdkBodyParameter,
  SdkBuiltInType,
  SdkClient,
  SdkClientType,
  SdkContext,
  SdkEndpointParameter,
  SdkEnumType,
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkHttpResponse,
  SdkInitializationType,
  SdkLroPagingServiceMethod,
  SdkLroServiceMethod,
  SdkMethod,
  SdkMethodParameter,
  SdkMethodResponse,
  SdkModelPropertyType,
  SdkModelPropertyTypeBase,
  SdkModelType,
  SdkOperationGroup,
  SdkPackage,
  SdkPagingServiceMethod,
  SdkParameter,
  SdkPathParameter,
  SdkQueryParameter,
  SdkServiceMethod,
  SdkServiceOperation,
  SdkServiceParameter,
  SdkServiceResponseHeader,
  SdkType,
} from "./interfaces.js";
import {
  getAvailableApiVersions,
  getClientNamespaceStringHelper,
  getDocHelper,
  getHashForType,
  getSdkTypeBaseHelper,
  isAcceptHeader,
  updateWithApiVersionInformation,
} from "./internal-utils.js";
import { getClientNamespaceString, getLibraryName } from "./public-utils.js";
import {
  getAllModels,
  getClientType,
  getSdkCredentialParameter,
  getSdkModelPropertyType,
} from "./types.js";

function getSdkHttpBodyParameters(
  context: SdkContext<SdkHttpOperation>,
  httpOperation: HttpOperation,
  methodParameters: SdkParameter[]
): SdkBodyParameter[] | undefined {
  const tspBody = httpOperation.parameters.body;
  if (tspBody === undefined) return undefined;
  if (!tspBody.parameter) {
    const bodyType = getClientType(context, tspBody.type, httpOperation.operation);
    return [
      {
        kind: "body",
        nameInClient: "body",
        description: getDocHelper(context, tspBody.type).description,
        details: getDocHelper(context, tspBody.type).details,
        onClient: false,
        contentTypes: ["application/json"],
        defaultContentType: "application/json",
        isApiVersionParam: false,
        apiVersions: getAvailableApiVersions<SdkHttpOperation>(context, tspBody.type),
        type: bodyType,
        optional: false,
      },
    ];
  }
  const body = getSdkModelPropertyType(context, tspBody.parameter!, {
    operation: httpOperation.operation,
  });
  const methodBodyParameter = methodParameters.find(
    (x) => x.nameInClient === tspBody.parameter!.name
  );
  if (body.kind !== "body") throw new Error("blah");
  if (methodBodyParameter) {
    return [body];
  } else {
    // this means that the body parameter is a property on one of the method parameters
    for (const methodParameter of methodParameters) {
      if (methodParameter.type.kind === "model") {
        const bodyProperty = methodParameter.type.properties.find((x) => x.kind === "body");
        if (bodyProperty) {
          return [body];
        }
      }
    }
  }
  throw new Error("blah");
}

function getSdkHttpParameters<TType extends SdkModelPropertyType>(
  context: SdkContext<SdkHttpOperation>,
  httpOperation: HttpOperation,
  filterFunction: (x: SdkModelPropertyType) => x is TType
): TType[] {
  return httpOperation.parameters.parameters
    .map((x) => getSdkModelPropertyType(context, x.param, { operation: httpOperation.operation }))
    .filter(filterFunction);
}

function getSdkHttpOperation(
  context: SdkContext<SdkHttpOperation>,
  httpOperation: HttpOperation,
  methodParameters: SdkMethodParameter[]
): SdkHttpOperation {
  const [responses, exception] = getSdkServiceResponseAndExceptions<SdkHttpOperation>(
    context,
    httpOperation
  );
  const pathParams = getSdkHttpParameters<SdkPathParameter>(
    context,
    httpOperation,
    (x): x is SdkPathParameter => x.kind === "path"
  );
  const queryParams = getSdkHttpParameters<SdkQueryParameter>(
    context,
    httpOperation,
    (x): x is SdkQueryParameter => x.kind === "query"
  );
  const headerParams = getSdkHttpParameters<SdkHeaderParameter>(
    context,
    httpOperation,
    (x): x is SdkHeaderParameter => x.kind === "header"
  );
  const bodyParams = getSdkHttpBodyParameters(context, httpOperation, methodParameters);
  const stringType: SdkBuiltInType = {
    kind: "string",
    encode: "string",
    nullable: false,
  }
  if (bodyParams && !headerParams.some(h => h.__raw && isContentTypeHeader(context.program, h.__raw))) {
    // We will always add a content type parameter if a body is being inputted
    const contentTypeBase = {
      clientDefaultValue: bodyParams[0].defaultContentType,
      nameInClient: "contentType",
      type: stringType,
      apiVersions: bodyParams[0].apiVersions,
      isApiVersionParam: false,
      onClient: false,
      optional: false,
      description: `Body parameter's content type. Known values are ${bodyParams[0].contentTypes}`,
    }
    headerParams.push({
      ...contentTypeBase,
      kind: "header",
      serializedName: "Content-Type",
    })
    if (!methodParameters.some(m => m.__raw && isContentTypeHeader(context.program, m.__raw))) {
      methodParameters.push({
        ...contentTypeBase,
        kind: "method",
      })
    }
  }
  const responsesWithBodies = Object.values(responses).filter(r => r.type)
  if ((responsesWithBodies.length > 0 || exception?.type) && !headerParams.some(h => isAcceptHeader(h))) {
    // Always have an accept header if we're returning any response with a body
    let clientDefaultValue: string = "";
    if (responsesWithBodies.length > 0) {
      clientDefaultValue = responsesWithBodies[0].defaultContentType!;
    } else {
      // we know that exception will have a body then
      clientDefaultValue = exception!.defaultContentType!;
    }
    const acceptBase = {
      nameInClient: "accept",
      type: stringType,
      apiVersions: context.__api_versions || [],
      isApiVersionParam: false,
      onClient: false,
      optional: false,
    }
    headerParams.push({
      ...acceptBase,
      kind: "header",
      clientDefaultValue,
      serializedName: "Accept",
    })
    if (!methodParameters.some(m => isAcceptHeader(m))) {
      methodParameters.push({
        ...acceptBase,
        clientDefaultValue,
        kind: "method",
      })
    }
  }
  return {
    __raw: httpOperation,
    kind: "http",
    path: httpOperation.path,
    verb: httpOperation.verb,
    pathParams,
    queryParams,
    headerParams,
    bodyParams: bodyParams || [],
    responses,
    exception,
  };
}

function getSdkServiceOperation<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  operation: Operation,
  methodParameters: SdkMethodParameter[]
): TServiceOperation {
  const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, operation));
  if (httpOperation) return getSdkHttpOperation(context, httpOperation, methodParameters) as any;
  throw new Error("Can't support other service operations yet");
}
function getSdkLroPagingServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  operation: Operation
): SdkLroPagingServiceMethod<TServiceOperation> {
  return {
    ...getSdkLroServiceMethod<TServiceOperation>(context, operation),
    ...getSdkPagingServiceMethod<TServiceOperation>(context, operation),
    kind: "lropaging",
  };
}

function getSdkPagingServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  operation: Operation
): SdkPagingServiceMethod<TServiceOperation> {
  const pagedMetadata = getPagedResult(context.program, operation)!;
  const basic = getSdkBasicServiceMethod<TServiceOperation>(context, operation);
  basic.response.responsePath = pagedMetadata.itemsSegments ? pagedMetadata.itemsSegments.join(".") : "";
  if (pagedMetadata.itemsProperty) {
    basic.response.type = getClientType(context, pagedMetadata.itemsProperty.type);
  }
  return {
    ...basic,
    __raw_paged_metadata: pagedMetadata,
    kind: "paging",
    nextLinkLogicalPath: pagedMetadata?.nextLinkSegments || [],
    nextLinkOperation: pagedMetadata?.nextLinkOperation
      ? getSdkServiceOperation<TServiceOperation>(
          context,
          pagedMetadata.nextLinkOperation,
          basic.parameters
        )
      : undefined,
  };
}

function getSdkLroServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  operation: Operation
): SdkLroServiceMethod<TServiceOperation> {
  const metadata = getLroMetadata(context.program, operation)!;
  const basicServiceMethod = getSdkBasicServiceMethod<TServiceOperation>(context, operation);
  basicServiceMethod.response.responsePath =
    metadata.logicalPath ??
    (metadata.envelopeResult !== metadata.logicalResult &&
    basicServiceMethod.operation.verb === "post"
      ? ".result"
      : ".");
  return {
    ...basicServiceMethod,
    kind: "lro",
    __raw_lro_metadata: metadata,
  };
}

function getSdkMethodResponse(
  operation: Operation,
  responses: Record<number, SdkHttpResponse>
): SdkMethodResponse {
  // TODO: put head as bool here
  const allResponseBodies: SdkType[] = [];
  let nonBodyExists = false;
  const headers: SdkServiceResponseHeader[] = [];
  for (const response of Object.values(responses)) {
    headers.push(...response.headers);
    if (response.type) {
      allResponseBodies.push(response.type);
    } else {
      nonBodyExists = true;
    }
  }
  const nullable = nonBodyExists && allResponseBodies.length > 0;
  const responseTypes = new Set<string>(allResponseBodies.map((x) => getHashForType(x)));
  let type: SdkType | undefined = undefined;
  if (responseTypes.size > 1) {
    // return union of all the different types
    type = {
      __raw: operation,
      kind: "union",
      values: allResponseBodies,
      nullable,
    };
  } else if (responseTypes) {
    type = allResponseBodies[0];
  }
  return {
    kind: "method",
    type,
  };
}

function getSdkServiceResponseAndExceptions<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  httpOperation: HttpOperation
): [Record<number | string, SdkHttpResponse>, SdkHttpResponse | undefined] {
  const responses: Record<number | string, SdkHttpResponse> = {};
  let exception: SdkHttpResponse | undefined;
  for (const response of httpOperation.responses) {
    const headers: SdkServiceResponseHeader[] = [];
    let body: Type | undefined;
    for (const data of response.responses) {
      for (const header of Object.values(data.headers || [])) {
        headers.push({
          __raw: header,
          description: getDocHelper(context, header).description,
          details: getDocHelper(context, header).details,
          serializedName: getHeaderFieldName(context.program, header),
          type: getClientType(context, header.type),
        });
      }
      if (data.body) {
        if (body && body !== data.body.type) {
          throw new Error("blah");
        }
        body = data.body.type;
      }
    }
    let contentTypes: string[] = [];
    for (const innerResponse of response.responses) {
      if (innerResponse.body) {
        contentTypes = contentTypes.concat(innerResponse.body.contentTypes)
      }
    }
    const sdkResponse: SdkHttpResponse = {
      __raw: response,
      kind: "http",
      type: body ? getClientType(context, body) : undefined,
      headers,
      contentTypes,
      defaultContentType: contentTypes.includes("application/json")
        ? "application/json"
        : contentTypes[0],
    };
    if (response.statusCodes === "*") {
      exception = sdkResponse;
    } else if (typeof response.statusCodes === "number") {
      responses[response.statusCodes] = sdkResponse;
    } else {
      responses[`${String(response.statusCodes.start)}-${String(response.statusCodes.end)}`] =
        sdkResponse;
    }
  }
  return [responses, exception];
}

function getParameterMappingHelper<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  method: SdkServiceMethod<TServiceOperation>,
  serviceParam: SdkServiceParameter
): SdkModelPropertyType[] {
  if (serviceParam.isApiVersionParam) {
    if (!context.__api_version_parameter) throw new Error("No api version on the client");
    return [context.__api_version_parameter];
  }
  const correspondingMethodParameter = method.parameters.find(
    (x) => x.nameInClient === serviceParam.nameInClient
  );
  if (correspondingMethodParameter) {
    return [correspondingMethodParameter];
  }
  function paramInProperties(param: SdkModelPropertyType, type: SdkType): boolean {
    if (type.kind !== "model") return false;
    return Array.from(type.properties.values())
      .filter((x) => x.kind === "property")
      .map((x) => x.nameInClient)
      .includes(param.nameInClient);
  }
  const serviceParamType = serviceParam.type;
  if (serviceParam.kind === "body" && serviceParamType.kind === "model") {
    // Here we have a spread body parameter
    const correspondingProperties = method.parameters.filter((x) =>
      paramInProperties(x, serviceParamType)
    );
    const bodyPropertyNames = serviceParamType.properties.filter((x) =>
      paramInProperties(x, serviceParamType)
    );
    if (correspondingProperties.length !== bodyPropertyNames.length) {
      throw new Error("Can't find corresponding properties for spread body parameter");
    }
    return correspondingProperties;
  }
  for (const methodParam of method.parameters) {
    if (methodParam.type.kind === "model") {
      for (const prop of methodParam.type.properties) {
        if (prop.nameInClient === serviceParam.nameInClient) {
          return [prop];
        }
      }
    }
  }
  throw new Error("Can't find corresponding parameter");
}

function getSdkBasicServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  operation: Operation
): SdkServiceMethod<TServiceOperation> {
  // when we spread, all of the inputtable properties of our model get flattened onto the method
  const methodParameters = Array.from(operation.parameters.properties.values())
    .map((x) => getSdkModelPropertyType(context, x, { isMethodParameter: true }))
    .filter((x): x is SdkMethodParameter => x.kind === "method");
  // if there's an api version parameter, we want to bubble it up to the client
  // we don't want it on the method level, but we will keep it on the service operation level
  const apiVersionParam = methodParameters.find((x) => x.isApiVersionParam);
  if (apiVersionParam && context.__api_version_parameter === undefined) {
    context.__api_version_parameter = apiVersionParam;
    context.__api_version_parameter.onClient = true;
    context.__api_version_parameter.optional = false;
  }
  const serviceOperation = getSdkServiceOperation<TServiceOperation>(
    context,
    operation,
    methodParameters
  );
  const response = getSdkMethodResponse(operation, serviceOperation.responses);
  return {
    __raw: operation,
    kind: "basic",
    name: getLibraryName(context, operation),
    access: getAccess(context, operation) ? "internal" : "public",
    parameters: methodParameters.filter((x) => !x.isApiVersionParam),
    description: getDocHelper(context, operation).description,
    details: getDocHelper(context, operation).details,
    overloads: [],
    operation: serviceOperation,
    response,
    exceptions: [],
    apiVersions: getAvailableApiVersions<SdkServiceOperation>(context, operation),
    getParameterMapping: function getParameterMapping(
      serviceParam: SdkServiceParameter
    ): SdkModelPropertyType[] {
      return getParameterMappingHelper<TServiceOperation>(context, this, serviceParam);
    },
  };
}

function getSdkServiceMethod<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  operation: Operation
): SdkServiceMethod<TServiceOperation> {
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

function getDefaultSdkEndpointParameter<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  client: SdkClient,
  clientDefaultValue?: unknown
): SdkEndpointParameter[] {
  return [
    {
      kind: "endpoint",
      nameInClient: "endpoint",
      description: getDocHelper(context, client.service).description,
      onClient: true,
      urlEncode: false,
      apiVersions: getAvailableApiVersions<TServiceOperation>(context, client.type),
      type: {
        ...getSdkTypeBaseHelper<"string", TServiceOperation>(context, client.service, "string"),
        encode: "string",
      },
      optional: false,
      clientDefaultValue,
      isApiVersionParam: false,
    },
  ];
}

function getEndpointAndEndpointParameters<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  client: SdkClient
): [string, SdkEndpointParameter[]] {
  const servers = getServers(context.program, client.service);
  if (servers === undefined) {
    return ["", getDefaultSdkEndpointParameter<TServiceOperation>(context, client)];
  }
  if (servers.length > 1) {
    return ["{endpoint}", getDefaultSdkEndpointParameter<TServiceOperation>(context, client)];
  }
  if (servers[0].parameters.size === 0) {
    return [
      servers[0].url,
      getDefaultSdkEndpointParameter<TServiceOperation>(context, client, servers[0].url),
    ];
  }
  const endpointParameters: SdkEndpointParameter[] = [];
  for (const param of servers[0].parameters.values()) {
    const sdkParam = getSdkModelPropertyType(context, param, { isEndpointParam: true });
    if (sdkParam.kind !== "path") {
      throw new Error("blah");
    }
    endpointParameters.push({
      ...sdkParam,
      kind: "endpoint",
      urlEncode: false,
      optional: false,
      ...updateWithApiVersionInformation(context, param),
      onClient: true,
    });
  }
  return [servers[0].url, endpointParameters];
}

function getSdkInitializationType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  client: SdkClient
): SdkInitializationType {
  const credentialParam = getSdkCredentialParameter<TServiceOperation>(context, client);
  const properties: SdkParameter[] = getEndpointAndEndpointParameters<TServiceOperation>(
    context,
    client
  )[1];
  if (credentialParam) {
    properties.push(credentialParam);
  }
  if (context.__api_version_parameter) {
    properties.push(context.__api_version_parameter);
  }
  const name = `${client.name.split(".").at(-1)}Options`;
  return {
    __raw: client.service,
    description: "Initialization class for the client",
    kind: "model",
    properties,
    name,
    access: "public",
    usage: UsageFlags.Input,
    additionalProperties: false,
    nullable: false,
    isAnonymous: false,
    crossLanguageDefinitionId: `${getNamespaceFullName(client.service.namespace!)}.${name}`,
  };
}

function getSdkMethods<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  client: SdkClient,
  group: SdkClient | SdkOperationGroup
): SdkMethod<TServiceOperation>[] {
  const retval: SdkMethod<TServiceOperation>[] = [];
  for (const operation of listOperationsInOperationGroup(context, group)) {
    retval.push(getSdkServiceMethod<TServiceOperation>(context, operation));
  }
  for (const operationGroup of listOperationGroups(context, group)) {
    // We create a client accessor for each operation group
    const operationGroupClient = createSdkClientType(context, client, operationGroup);
    retval.push({
      kind: "clientaccessor",
      parameters: [],
      name: `get${operationGroup.type.name}`,
      description: getDocHelper(context, operationGroup.type).description,
      details: getDocHelper(context, operationGroup.type).details,
      access: "internal",
      response: operationGroupClient,
      apiVersions: getAvailableApiVersions<TServiceOperation>(context, operationGroup.type)
    });
  }
  return retval;
}

function createSdkClientType<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>,
  client: SdkClient,
  operationGroup?: SdkOperationGroup
): SdkClientType<TServiceOperation> {
  if (!context.__clients) {
    context.__clients = new Map<SdkClient, SdkClientType<TServiceOperation>>();
  }
  if (context.__clients.has(client)) return context.__clients.get(client)!;
  const baseClientType = operationGroup ?? client;
  const docWrapper = getDocHelper(context, baseClientType.type);
  context.__api_versions = resolveVersions(context.program, client.service)
    .filter((x) => x.rootVersion)
    .map((x) => x.rootVersion!.value);
  const isClient = baseClientType.kind === "SdkClient";
  const sdkClientType: SdkClientType<TServiceOperation> = {
    kind: "client",
    name: isClient ? baseClientType.name : baseClientType.type.name,
    description: docWrapper.description,
    details: docWrapper.details,
    methods: getSdkMethods(context, client, baseClientType),
    apiVersions: getAvailableApiVersions<TServiceOperation>(context, client.type),
    nameSpace: getClientNamespaceStringHelper(context, client.service)!,
    initialization: isClient
      ? getSdkInitializationType<TServiceOperation>(context, client)
      : undefined,
    endpoint: getEndpointAndEndpointParameters<TServiceOperation>(context, client)[0],
    arm: client.arm,
  };
  context.__clients.set(baseClientType, sdkClientType);
  return sdkClientType;
}

export function getSdkPackage<TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TServiceOperation>
): SdkPackage<TServiceOperation> {
  const modelsAndEnums = getAllModels(context);
  context.__clients = new Map<SdkClient, SdkClientType<TServiceOperation>>();
  for (const client of listClients(context)) {
    createSdkClientType(context, client);
  }
  return {
    name: getClientNamespaceString(context)!,
    rootNamespace: getClientNamespaceString(context)!,
    clients: Array.from(context.__clients.values()),
    models: modelsAndEnums.filter((x): x is SdkModelType => x.kind === "model"),
    enums: modelsAndEnums.filter((x): x is SdkEnumType => x.kind === "enum"),
  };
}
