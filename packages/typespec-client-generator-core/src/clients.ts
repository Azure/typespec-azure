import { createDiagnosticCollector, Diagnostic, getDoc, getSummary } from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
import { getServers, HttpServer } from "@typespec/http";
import {
  getClientInitializationOptions,
  getClientNamespace,
  listOperationGroups,
} from "./decorators.js";
import { getSdkHttpParameter } from "./http.js";
import {
  InitializedByFlags,
  SdkClient,
  SdkClientInitializationType,
  SdkClientType,
  SdkEndpointParameter,
  SdkEndpointType,
  SdkHttpOperation,
  SdkMethodParameter,
  SdkModelPropertyType,
  SdkOperationGroup,
  SdkPathParameter,
  SdkServiceOperation,
  SdkUnionType,
  TCGCContext,
  UsageFlags,
} from "./interfaces.js";
import {
  createGeneratedName,
  getAvailableApiVersions,
  getTypeDecorators,
  getValueTypeValue,
  isSubscriptionId,
  updateWithApiVersionInformation,
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
import { createSdkMethods } from "./methods.js";
import { getCrossLanguageDefinitionId, getLibraryName } from "./public-utils.js";
import {
  getSdkBuiltInType,
  getSdkCredentialParameter,
  getSdkModelWithDiagnostics,
} from "./types.js";

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
        explode: false,
        style: "simple",
        allowReserved: true,
        optional: false,
        serializedName: "endpoint",
        correspondingMethodParams: [],
        type: getSdkBuiltInType(context, $.builtin.url),
        isApiVersionParam: false,
        apiVersions: context.getApiVersionsForType(client.__raw.type),
        crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, client.__raw.service)}.endpoint`,
        decorators: [],
        access: "public",
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
      namespace: getClientNamespace(context, rawClient.service),
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
    apiVersions: context.getApiVersionsForType(rawClient.type),
    optional: false,
    isApiVersionParam: false,
    crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, rawClient.service)}.endpoint`,
    decorators: [],
    access: "public",
  });
}

export function createSdkClientType<TServiceOperation extends SdkServiceOperation>(
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
    apiVersions: context.getApiVersionsForType(client.type),
    namespace: getClientNamespace(context, client.type),
    clientInitialization: diagnostics.pipe(createSdkClientInitializationType(context, client)),
    decorators: diagnostics.pipe(getTypeDecorators(context, client.type)),
    parent,
    // if it is client, the crossLanguageDefinitionId is the ${namespace}, if it is operation group, the crosslanguageDefinitionId is the %{namespace}.%{operationGroupName}
    crossLanguageDefinitionId: getCrossLanguageDefinitionId(context, client.type),
  };
  // NOTE: getSdkMethods recursively calls createSdkClientType
  sdkClientType.methods = diagnostics.pipe(
    createSdkMethods<TServiceOperation>(context, client, sdkClientType),
  );
  addDefaultClientParameters(context, sdkClientType);
  // update initialization model properties

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
    for (const sc of listOperationGroups(context, client.__raw, true)) {
      // if any sub operation groups have an api version param, the top level needs
      // the api version param as well
      apiVersionParam = context.__clientToParameters.get(sc.type)?.find((x) => x.isApiVersionParam);
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
    for (const sc of listOperationGroups(context, client.__raw, true)) {
      // if any sub operation groups have an subId param, the top level needs it as well
      subId = context.__clientToParameters.get(sc.type)?.find((x) => isSubscriptionId(context, x));
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
