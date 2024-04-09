import { getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import {
  Diagnostic,
  Model,
  ModelProperty,
  Operation,
  createDiagnosticCollector,
  getNamespaceFullName,
  getService,
  ignoreDiagnostics,
  isKey,
} from "@typespec/compiler";
import { getServers } from "@typespec/http";
import { resolveVersions } from "@typespec/versioning";
import { camelCase } from "change-case";
import {
  getAccess,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
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
  SdkServiceResponseHeader,
  SdkType,
  UsageFlags,
} from "./interfaces.js";
import {
  TCGCContext,
  createGeneratedName,
  getAllResponseBodies,
  getAvailableApiVersions,
  getClientNamespaceStringHelper,
  getDocHelper,
  getHashForType,
  getSdkTypeBaseHelper,
  isNullable,
  updateWithApiVersionInformation,
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
import {
  getClientNamespaceString,
  getCrossLanguagePackageId,
  getDefaultApiVersion,
  getHttpOperationWithCache,
  getLibraryName,
  isApiVersion,
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

  basicServiceMethod.response.type = diagnostics.pipe(
    getClientTypeWithDiagnostics(context, metadata.logicalResult)
  );
  basicServiceMethod.response.resultPath =
    metadata.logicalPath ??
    (metadata.envelopeResult !== metadata.logicalResult &&
    basicServiceMethod.operation.verb === "post"
      ? "result"
      : undefined);
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
      isGeneratedName: true,
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

function getSdkBasicServiceMethod<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(
  context: SdkContext<TOptions, TServiceOperation>,
  operation: Operation
): [SdkServiceMethod<TServiceOperation>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  // when we spread, all of the inputtable properties of our model get flattened onto the method
  const methodParameters: SdkMethodParameter[] = [];
  const spreadModelNames: string[] = [];
  for (const prop of operation.parameters.properties.values()) {
    if (
      prop.sourceProperty?.model?.name &&
      !isKey(context.program, prop.sourceProperty) &&
      !isApiVersion(context, prop)
    ) {
      if (!spreadModelNames.includes(prop.sourceProperty.model.name)) {
        spreadModelNames.push(prop.sourceProperty.model.name);
        methodParameters.push(
          diagnostics.pipe(getSdkMethodParameter(context, prop.sourceProperty.model))
        );
      }
    } else {
      // workaround for the provider parameter in arm, need to refine method design in tcgc later
      if (!context.arm || prop.name !== "provider") {
        methodParameters.push(diagnostics.pipe(getSdkMethodParameter(context, prop)));
      }
    }
  }

  // if there's an api version parameter, we want to bubble it up to the client
  // we don't want it on the method level, but we will keep it on the service operation level
  const apiVersionParam = methodParameters.find((x) => x.isApiVersionParam);
  if (apiVersionParam && context.__api_version_parameter === undefined) {
    context.__api_version_parameter = {
      ...apiVersionParam,
      name: "apiVersion",
      nameInClient: "apiVersion",
      isGeneratedName: apiVersionParam.name !== "apiVersion",
      onClient: true,
      optional: false,
      clientDefaultValue: context.__api_version_client_default_value,
    };
  }
  const serviceOperation = diagnostics.pipe(
    getSdkServiceOperation<TOptions, TServiceOperation>(context, operation, methodParameters)
  );
  const response = getSdkMethodResponse(operation, serviceOperation);
  const name = getLibraryName(context, operation);
  return diagnostics.wrap({
    __raw: operation,
    kind: "basic",
    name,
    access: getAccess(context, operation),
    parameters: methodParameters.filter((x) => !x.isApiVersionParam),
    description: getDocHelper(context, operation).description,
    details: getDocHelper(context, operation).details,
    operation: serviceOperation,
    response,
    apiVersions: getAvailableApiVersions(context, operation),
    getParameterMapping: function getParameterMapping(
      serviceParam: SdkServiceParameter
    ): SdkModelPropertyType[] {
      return ignoreDiagnostics(
        getCorrespondingMethodParams(context, name, methodParameters, serviceParam)
      );
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
>(
  context: SdkContext<TOptions, TServiceOperation>,
  client: SdkClient | SdkOperationGroup
): string | undefined {
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
  if (context.__api_version_parameter) {
    properties.push(context.__api_version_parameter);
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
    nullable: false,
    crossLanguageDefinitionId: `${getNamespaceFullName(client.service.namespace!)}.${name}`,
    apiVersions: getAvailableApiVersions(context, client.service),
    isFormDataType: false,
    isError: false,
  });
}

function getSdkMethodParameter(
  context: TCGCContext,
  type: ModelProperty | Model
): [SdkMethodParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (type.kind === "Model") {
    const libraryName = getLibraryName(context, type);
    const name = camelCase(libraryName ?? "body");
    const propertyType = diagnostics.pipe(getClientTypeWithDiagnostics(context, type));
    return diagnostics.wrap({
      kind: "method",
      description: getDocHelper(context, type).description,
      details: getDocHelper(context, type).details,
      apiVersions: getAvailableApiVersions(context, type),
      type: propertyType,
      nameInClient: name,
      name,
      isGeneratedName: Boolean(libraryName),
      optional: false,
      nullable: false,
      discriminator: false,
      serializedName: name,
      ...updateWithApiVersionInformation(context, type),
    });
  }
  return diagnostics.wrap({
    ...diagnostics.pipe(getSdkModelPropertyType(context, type)),
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
      nullable: false,
      serverUrl: "{endpoint}",
      templateArguments: [
        {
          name,
          nameInClient: name,
          isGeneratedName: true,
          description: "Service host",
          kind: "path",
          onClient: true,
          nullable: false,
          urlEncode: false,
          optional: false,
          serializedName: "endpoint",
          correspondingMethodParams: [],
          type: {
            ...getSdkTypeBaseHelper(context, client.service, "string"),
            encode: "string",
          },
          isApiVersionParam: false,
          apiVersions: getAvailableApiVersions(context, client.service),
        },
      ],
    };
  } else {
    // this means we have one server
    const templateArguments: SdkPathParameter[] = [];
    type = {
      kind: "endpoint",
      nullable: false,
      serverUrl: servers[0].url,
      templateArguments,
    };
    for (const param of servers[0].parameters.values()) {
      const sdkParam = diagnostics.pipe(getSdkHttpParameter(context, param, "path"));
      if (sdkParam.kind === "path") {
        templateArguments.push(sdkParam);
        sdkParam.description = sdkParam.description ?? servers[0].description;
        sdkParam.onClient = true;
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
    nameInClient: "endpoint",
    name: "endpoint",
    isGeneratedName: true,
    description: "Service host",
    onClient: true,
    urlEncode: false,
    apiVersions: getAvailableApiVersions(context, client.service),
    optional,
    isApiVersionParam: false,
    nullable: false,
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
  const clientName = isClient ? client.name : client.type.name;
  context.__api_versions = resolveVersions(context.program, client.service)
    .filter((x) => x.rootVersion)
    .map((x) => x.rootVersion!.value);
  context.__api_version_client_default_value = getClientDefaultApiVersion(context, client);

  // NOTE: getSdkMethods recursively calls createSdkClientType
  const methods = diagnostics.pipe(getSdkMethods(context, client));
  const docWrapper = getDocHelper(context, client.type);
  const sdkClientType: SdkClientType<TServiceOperation> = {
    kind: "client",
    name: clientName,
    description: docWrapper.description,
    details: docWrapper.details,
    methods: methods,
    apiVersions: getAvailableApiVersions(context, client.type),
    nameSpace: getClientNamespaceStringHelper(context, client.service)!,
    initialization: diagnostics.pipe(
      getSdkInitializationType<TOptions, TServiceOperation>(context, client)
    ), // MUST call this after getSdkMethods has been called
    // eslint-disable-next-line deprecation/deprecation
    arm: client.kind === "SdkClient" ? client.arm : false,
  };
  context.__clients!.push(sdkClientType);
  return diagnostics.wrap(sdkClientType);
}

export function getSdkPackage<
  TOptions extends object,
  TServiceOperation extends SdkServiceOperation,
>(context: SdkContext<TOptions, TServiceOperation>): SdkPackage<TServiceOperation> {
  const diagnostics = createDiagnosticCollector();
  const modelsAndEnums = diagnostics.pipe(getAllModelsWithDiagnostics(context));
  context.__clients = new Array<SdkClientType<TServiceOperation>>();
  for (const client of listClients(context)) {
    createSdkClientType(context, client);
  }
  const crossLanguagePackageId = diagnostics.pipe(getCrossLanguagePackageId(context));
  return {
    name: getClientNamespaceString(context)!,
    rootNamespace: getClientNamespaceString(context)!,
    clients: Array.from(context.__clients.values()),
    models: modelsAndEnums.filter((x): x is SdkModelType => x.kind === "model"),
    enums: modelsAndEnums.filter((x): x is SdkEnumType => x.kind === "enum"),
    diagnostics: diagnostics.diagnostics,
    crossLanguagePackageId,
  };
}
