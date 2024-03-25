import { getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import {
  Diagnostic,
  Operation,
  Type,
  createDiagnosticCollector,
  getNamespaceFullName,
  getService,
  isErrorModel,
} from "@typespec/compiler";
import { HttpOperation, getHeaderFieldName, isContentTypeHeader } from "@typespec/http";
import { resolveVersions } from "@typespec/versioning";
import {
  getAccess,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
} from "./decorators.js";
import {
  SdkBodyParameter,
  SdkClient,
  SdkClientType,
  SdkContext,
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
  UsageFlags,
} from "./interfaces.js";
import {
  createGeneratedName,
  getAllResponseBodies,
  getAvailableApiVersions,
  getClientNamespaceStringHelper,
  getDocHelper,
  getHashForType,
  isAcceptHeader,
  isNullable,
} from "./internal-utils.js";
import {
  getClientNamespaceString,
  getDefaultApiVersion,
  getHttpOperationWithCache,
  getLibraryName,
  getPropertyNames,
} from "./public-utils.js";
import {
  addEncodeInfo,
  addFormatInfo,
  getAllModelsWithDiagnostics,
  getClientTypeWithDiagnostics,
  getSdkCredentialParameter,
  getSdkEndpointParameter,
  getSdkModelPropertyType,
} from "./types.js";

function getSdkHttpBodyParameters<TOptions extends object>(
  context: SdkContext<TOptions, SdkHttpOperation>,
  httpOperation: HttpOperation,
  methodParameters: SdkParameter[]
): [SdkBodyParameter[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const tspBody = httpOperation.parameters.body;
  if (tspBody === undefined) return diagnostics.wrap([]);
  let contentTypes = tspBody.contentTypes;
  if (contentTypes.length === 0) {
    contentTypes = ["application/json"];
  }
  const defaultContentType = contentTypes.includes("application/json")
    ? "application/json"
    : contentTypes[0];
  if (!tspBody.parameter) {
    const bodyType = diagnostics.pipe(
      getClientTypeWithDiagnostics(context, tspBody.type, httpOperation.operation)
    );
    const name = "body";
    return diagnostics.wrap([
      {
        kind: "body",
        nameInClient: name,
        name,
        description: getDocHelper(context, tspBody.type).description,
        details: getDocHelper(context, tspBody.type).details,
        onClient: false,
        contentTypes: contentTypes,
        defaultContentType: defaultContentType,
        isApiVersionParam: false,
        apiVersions: getAvailableApiVersions(context, tspBody.type),
        type: bodyType,
        optional: false,
        nullable: isNullable(tspBody.type),
      },
    ]);
  }
  const body = diagnostics.pipe(
    getSdkModelPropertyType(context, tspBody.parameter!, {
      operation: httpOperation.operation,
      defaultContentType: defaultContentType,
    })
  );
  const methodBodyParameter = methodParameters.find(
    (x) => x.name === getPropertyNames(context, tspBody.parameter!)[0]
  );
  if (body.kind !== "body") throw new Error("blah");
  if (methodBodyParameter) {
    return diagnostics.wrap([
      {
        ...body,
        contentTypes,
        defaultContentType,
      },
    ]);
  } else {
    // this means that the body parameter is a property on one of the method parameters
    for (const methodParameter of methodParameters) {
      if (methodParameter.type.kind === "model") {
        const bodyProperty = methodParameter.type.properties.find((x) => x.kind === "body");
        if (bodyProperty) {
          return diagnostics.wrap([
            {
              ...body,
              contentTypes,
              defaultContentType,
            },
          ]);
        }
      }
    }
  }
  throw new Error("blah");
}

function createContentTypeOrAcceptHeader(
  bodyObject: SdkBodyParameter | SdkHttpResponse
): Omit<SdkMethodParameter, "kind"> {
  const name = bodyObject.kind === "body" ? "contentType" : "accept";
  let type: SdkType = {
    kind: "string",
    encode: "string",
    nullable: false,
  };
  // for contentType, we treat it as a constant IFF there's one value and it's application/json.
  // this is to prevent a breaking change when a service adds more content types in the future.
  // e.g. the service accepting image/png then later image/jpeg should _not_ be a breaking change.
  //
  // for accept, we treat it as a constant IFF there's a single value. adding more content types
  // for this case is considered a breaking change for SDKs so we want to surface it as such.
  // e.g. the service returns image/png then later provides the option to return image/jpeg.
  if (
    bodyObject.contentTypes &&
    bodyObject.contentTypes.length === 1 &&
    (/json/.test(bodyObject.contentTypes[0]) || name === "accept")
  ) {
    // in this case, we just want a content type of application/json
    type = {
      nullable: false,
      kind: "constant",
      value: bodyObject.contentTypes[0],
      valueType: type,
    };
  }
  // No need for clientDefaultValue because it's a constant, it only has one value
  return {
    type,
    nameInClient: name,
    name,
    apiVersions: bodyObject.apiVersions,
    isApiVersionParam: false,
    onClient: false,
    optional: false,
    nullable: false,
  };
}

function getSdkHttpOperation<TOptions extends object>(
  context: SdkContext<TOptions, SdkHttpOperation>,
  httpOperation: HttpOperation,
  methodParameters: SdkMethodParameter[]
): [SdkHttpOperation, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const [responses, exceptions] = diagnostics.pipe(
    getSdkServiceResponseAndExceptions<TOptions, SdkHttpOperation>(context, httpOperation)
  );
  const parameters = httpOperation.parameters.parameters
    .map((x) =>
      diagnostics.pipe(
        getSdkModelPropertyType(context, x.param, { operation: httpOperation.operation })
      )
    )
    .filter(
      (x): x is SdkHeaderParameter | SdkQueryParameter | SdkPathParameter =>
        x.kind === "header" || x.kind === "query" || x.kind === "path"
    );
  const headerParams = parameters.filter((x): x is SdkHeaderParameter => x.kind === "header");
  const bodyParams = diagnostics.pipe(
    getSdkHttpBodyParameters(context, httpOperation, methodParameters)
  );

  if (
    bodyParams.length &&
    !headerParams.some((h) => h.__raw && isContentTypeHeader(context.program, h.__raw))
  ) {
    // We will always add a content type parameter if a body is being inputted
    const contentTypeBase = {
      ...createContentTypeOrAcceptHeader(bodyParams[0]),
      description: `Body parameter's content type. Known values are ${bodyParams[0].contentTypes}`,
    };
    parameters.push({
      ...contentTypeBase,
      kind: "header",
      serializedName: "Content-Type",
    });
    if (!methodParameters.some((m) => m.__raw && isContentTypeHeader(context.program, m.__raw))) {
      methodParameters.push({
        ...contentTypeBase,
        kind: "method",
      });
    }
  }
  const responsesWithBodies = Object.values(responses)
    .concat(Object.values(exceptions))
    .filter((r) => r.type);
  if (responsesWithBodies.length > 0 && !headerParams.some((h) => isAcceptHeader(h))) {
    // Always have an accept header if we're returning any response with a body
    const acceptBase = {
      ...createContentTypeOrAcceptHeader(responsesWithBodies[0]),
    };
    parameters.push({
      ...acceptBase,
      kind: "header",
      serializedName: "Accept",
    });
    if (!methodParameters.some((m) => m.name === "accept")) {
      methodParameters.push({
        ...acceptBase,
        kind: "method",
      });
    }
  }
  return diagnostics.wrap({
    __raw: httpOperation,
    kind: "http",
    path: httpOperation.path,
    verb: httpOperation.verb,
    parameters,
    bodyParams: bodyParams || [],
    responses,
    exceptions,
  });
}

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
  throw new Error("Can't support other service operations yet");
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
      return pagedMetadata?.itemsSegments?.join(".");
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

  basicServiceMethod.response.type = diagnostics.pipe(
    getClientTypeWithDiagnostics(context, metadata.logicalResult)
  );
  return diagnostics.wrap({
    ...basicServiceMethod,
    kind: "lro",
    __raw_lro_metadata: metadata,
    initialOperation: diagnostics.pipe(
      getSdkServiceOperation<TOptions, TServiceOperation>(
        context,
        metadata.operation,
        basicServiceMethod.parameters
      )
    ),
    getResponseMapping(): string | undefined {
      return (
        metadata.logicalPath ??
        (metadata.envelopeResult !== metadata.logicalResult && this.operation.verb === "post"
          ? "result"
          : undefined)
      );
    },
  });
}

function getSdkMethodResponse(
  operation: Operation,
  sdkOperation: SdkServiceOperation
): SdkMethodResponse {
  const responses = sdkOperation.responses;
  // TODO: put head as bool here
  const headers: SdkServiceResponseHeader[] = [];
  for (const response of Object.values(responses)) {
    headers.push(...response.headers);
  }
  const allResponseBodies = getAllResponseBodies(responses);
  const responseTypes = new Set<string>(allResponseBodies.map((x) => getHashForType(x)));
  let type: SdkType | undefined = undefined;
  if (responseTypes.size > 1) {
    // return union of all the different types
    type = {
      __raw: operation,
      kind: "union",
      values: allResponseBodies,
      nullable: isNullable(sdkOperation),
      name: createGeneratedName(operation, "UnionResponse"),
      generatedName: true,
    };
  } else if (responseTypes) {
    type = allResponseBodies[0];
  }
  return {
    kind: "method",
    type,
    nullable: isNullable(sdkOperation),
  };
}

function getSdkServiceResponseAndExceptions<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  httpOperation: HttpOperation
): [
  [Record<number | string, SdkHttpResponse>, Record<number | string, SdkHttpResponse>],
  readonly Diagnostic[],
] {
  const diagnostics = createDiagnosticCollector();
  const responses: Record<number | string, SdkHttpResponse> = {};
  const exceptions: Record<number | string | "*", SdkHttpResponse> = {};
  for (const response of httpOperation.responses) {
    const headers: SdkServiceResponseHeader[] = [];
    let body: Type | undefined;
    let contentTypes: string[] = [];

    for (const innerResponse of response.responses) {
      for (const header of Object.values(innerResponse.headers || [])) {
        const clientType = diagnostics.pipe(getClientTypeWithDiagnostics(context, header.type));
        const defaultContentType = innerResponse.body?.contentTypes.includes("application/json")
          ? "application/json"
          : innerResponse.body?.contentTypes[0];
        addEncodeInfo(context, header, clientType, defaultContentType);
        addFormatInfo(context, header, clientType);
        headers.push({
          __raw: header,
          description: getDocHelper(context, header).description,
          details: getDocHelper(context, header).details,
          serializedName: getHeaderFieldName(context.program, header),
          type: clientType,
          nullable: isNullable(header.type),
        });
      }
      if (innerResponse.body) {
        if (body && body !== innerResponse.body.type) {
          throw new Error("blah");
        }
        contentTypes = contentTypes.concat(innerResponse.body.contentTypes);
        body = innerResponse.body.type;
      }
    }

    const sdkResponse: SdkHttpResponse = {
      __raw: response,
      kind: "http",
      type: body ? diagnostics.pipe(getClientTypeWithDiagnostics(context, body)) : undefined,
      headers,
      contentTypes,
      defaultContentType: contentTypes.includes("application/json")
        ? "application/json"
        : contentTypes[0],
      apiVersions: getAvailableApiVersions(context, httpOperation.operation),
      nullable: body ? isNullable(body) : true,
    };
    let statusCode: number | string = "";
    if (typeof response.statusCodes === "number" || response.statusCodes === "*") {
      statusCode = response.statusCodes;
    } else {
      statusCode = `${response.statusCodes.start}-${response.statusCodes.end}`;
    }
    if (statusCode === "*" || (body && isErrorModel(context.program, body))) {
      exceptions[statusCode] = sdkResponse;
    } else {
      responses[statusCode] = sdkResponse;
    }
  }
  return diagnostics.wrap([responses, exceptions]);
}

function getParameterMappingHelper<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  method: SdkServiceMethod<TServiceOperation>,
  serviceParam: SdkServiceParameter
): SdkModelPropertyType[] {
  if (serviceParam.isApiVersionParam) {
    if (!context.__api_version_parameter) throw new Error("No api version on the client");
    return [context.__api_version_parameter];
  }
  const correspondingMethodParameter = method.parameters.find((x) => x.name === serviceParam.name);
  if (correspondingMethodParameter) {
    return [correspondingMethodParameter];
  }
  function paramInProperties(param: SdkModelPropertyType, type: SdkType): boolean {
    if (type.kind !== "model") return false;
    return Array.from(type.properties.values())
      .filter((x) => x.kind === "property")
      .map((x) => x.name)
      .includes(param.name);
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
        if (prop.name === serviceParam.name) {
          return [prop];
        }
      }
    }
  }
  throw new Error("Can't find corresponding parameter");
}

function getSdkBasicServiceMethod<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation
): [SdkServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  // when we spread, all of the inputtable properties of our model get flattened onto the method
  const methodParameters = Array.from(operation.parameters.properties.values())
    .map((x) => diagnostics.pipe(getSdkModelPropertyType(context, x, { isMethodParameter: true })))
    .filter((x): x is SdkMethodParameter => x.kind === "method");
  // if there's an api version parameter, we want to bubble it up to the client
  // we don't want it on the method level, but we will keep it on the service operation level
  const apiVersionParam = methodParameters.find((x) => x.isApiVersionParam);
  if (apiVersionParam && context.__api_version_parameter === undefined) {
    context.__api_version_parameter = {
      ...apiVersionParam,
      onClient: true,
      optional: false,
      clientDefaultValue: context.__api_version_client_default_value,
    };
  }
  const serviceOperation = diagnostics.pipe(
    getSdkServiceOperation<TOptions, TServiceOperation>(context, operation, methodParameters)
  );
  const response = getSdkMethodResponse(operation, serviceOperation);
  return diagnostics.wrap({
    __raw: operation,
    kind: "basic",
    name: getLibraryName(context, operation),
    access: getAccess(context, operation),
    parameters: methodParameters.filter((x) => !x.isApiVersionParam),
    description: getDocHelper(context, operation).description,
    details: getDocHelper(context, operation).details,
    overloads: [],
    operation: serviceOperation,
    response,
    apiVersions: getAvailableApiVersions(context, operation),
    getParameterMapping: function getParameterMapping(
      serviceParam: SdkServiceParameter
    ): SdkModelPropertyType[] {
      return getParameterMappingHelper<TOptions, TServiceOperation>(context, this, serviceParam);
    },
    getResponseMapping: function getResponseMapping(): string | undefined {
      return undefined; // currently we only return a value for paging or lro
    },
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
>(context: SdkContext<TOptions, TServiceOperation>, client: SdkClient): string | undefined {
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
  client: SdkClient
): [SdkInitializationType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const credentialParam = getSdkCredentialParameter(context, client);
  const properties: SdkParameter[] = [
    diagnostics.pipe(getSdkEndpointParameter(context, client)), // there will always be an endpoint parameter
  ];
  if (credentialParam) {
    properties.push(credentialParam);
  }
  if (context.__api_version_parameter) {
    properties.push(context.__api_version_parameter);
  }
  const name = `${client.name.split(".").at(-1)}Options`;
  return diagnostics.wrap({
    __raw: client.service,
    description: "Initialization class for the client",
    kind: "model",
    properties,
    name,
    generatedName: true,
    access: "public",
    usage: UsageFlags.Input,
    nullable: false,
    crossLanguageDefinitionId: `${getNamespaceFullName(client.service.namespace!)}.${name}`,
    apiVersions: getAvailableApiVersions(context, client.service),
    isFormDataType: false,
    isError: false,
  });
}

function getSdkMethods<TOptions extends object, TServiceOperation extends SdkServiceOperation>(
  context: SdkContext<TOptions, TServiceOperation>,
  client: SdkClient,
  group: SdkClient | SdkOperationGroup
): [SdkMethod<TServiceOperation>[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const retval: SdkMethod<TServiceOperation>[] = [];
  for (const operation of listOperationsInOperationGroup(context, group)) {
    retval.push(
      diagnostics.pipe(getSdkServiceMethod<TOptions, TServiceOperation>(context, operation))
    );
  }
  for (const operationGroup of listOperationGroups(context, group)) {
    // We create a client accessor for each operation group
    const operationGroupClient = diagnostics.pipe(
      createSdkClientType(context, client, operationGroup)
    );
    retval.push({
      kind: "clientaccessor",
      parameters: [],
      name: `get${operationGroup.type.name}`,
      description: getDocHelper(context, operationGroup.type).description,
      details: getDocHelper(context, operationGroup.type).details,
      access: "internal",
      response: operationGroupClient,
      apiVersions: getAvailableApiVersions(context, operationGroup.type),
    });
  }
  return diagnostics.wrap(retval);
}

function createSdkClientType<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  client: SdkClient,
  operationGroup?: SdkOperationGroup
): [SdkClientType<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const baseClientType = operationGroup ?? client;
  const isClient = baseClientType.kind === "SdkClient";
  const clientName = isClient ? baseClientType.name : baseClientType.type.name;
  context.__api_versions = resolveVersions(context.program, client.service)
    .filter((x) => x.rootVersion)
    .map((x) => x.rootVersion!.value);
  context.__api_version_client_default_value = getClientDefaultApiVersion(context, client);

  // NOTE: getSdkMethods recursively calls createSdkClientType
  const methods = diagnostics.pipe(getSdkMethods(context, client, baseClientType));
  const docWrapper = getDocHelper(context, baseClientType.type);
  const sdkClientType: SdkClientType<TServiceOperation> = {
    kind: "client",
    name: clientName,
    description: docWrapper.description,
    details: docWrapper.details,
    methods: methods,
    apiVersions: getAvailableApiVersions(context, client.type),
    nameSpace: getClientNamespaceStringHelper(context, client.service)!,
    initialization: isClient
      ? diagnostics.pipe(getSdkInitializationType<TOptions, TServiceOperation>(context, client)) // MUST call this after getSdkMethods has been called
      : undefined,
    // eslint-disable-next-line deprecation/deprecation
    arm: client.arm,
  };
  context.__clients!.push(sdkClientType);
  return diagnostics.wrap(sdkClientType);
}

export function experimental_getSdkPackage<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(context: SdkContext<TOptions, TServiceOperation>): SdkPackage<TServiceOperation> {
  const diagnostics = createDiagnosticCollector();
  const modelsAndEnums = diagnostics.pipe(getAllModelsWithDiagnostics(context));
  context.__clients = new Array<SdkClientType<TServiceOperation>>();
  for (const client of listClients(context)) {
    createSdkClientType(context, client);
  }
  return {
    name: getClientNamespaceString(context)!,
    rootNamespace: getClientNamespaceString(context)!,
    clients: Array.from(context.__clients.values()),
    models: modelsAndEnums.filter((x): x is SdkModelType => x.kind === "model"),
    enums: modelsAndEnums.filter((x): x is SdkEnumType => x.kind === "enum"),
    diagnostics: diagnostics.diagnostics,
  };
}
