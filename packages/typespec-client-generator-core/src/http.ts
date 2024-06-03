import {
  Diagnostic,
  ModelProperty,
  Operation,
  Type,
  createDiagnosticCollector,
  ignoreDiagnostics,
  isErrorModel,
} from "@typespec/compiler";
import {
  HttpOperation,
  HttpStatusCodeRange,
  getHeaderFieldName,
  getHeaderFieldOptions,
  getPathParamName,
  getQueryParamName,
  getQueryParamOptions,
  isBody,
  isHeader,
  isPathParam,
  isQueryParam,
} from "@typespec/http";
import { camelCase } from "change-case";
import {
  CollectionFormat,
  SdkBodyParameter,
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkHttpParameter,
  SdkHttpResponse,
  SdkMethodParameter,
  SdkModelPropertyType,
  SdkModelType,
  SdkParameter,
  SdkPathParameter,
  SdkQueryParameter,
  SdkServiceResponseHeader,
  SdkType,
} from "./interfaces.js";
import {
  TCGCContext,
  getAvailableApiVersions,
  getDocHelper,
  getLocationOfOperation,
  isAcceptHeader,
  isContentTypeHeader,
  isNeverOrVoidType,
  isSubscriptionId,
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
import { getCrossLanguageDefinitionId, getEffectivePayloadType } from "./public-utils.js";
import {
  addEncodeInfo,
  addFormatInfo,
  getClientTypeWithDiagnostics,
  getSdkModelPropertyTypeBase,
} from "./types.js";

export function getSdkHttpOperation(
  context: TCGCContext,
  httpOperation: HttpOperation,
  methodParameters: SdkMethodParameter[]
): [SdkHttpOperation, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const { responses, exceptions } = diagnostics.pipe(
    getSdkHttpResponseAndExceptions(context, httpOperation)
  );
  const responsesWithBodies = [...responses.values()]
    .concat([...exceptions.values()])
    .filter((r) => r.type);
  const parameters = diagnostics.pipe(
    getSdkHttpParameters(context, httpOperation, methodParameters, responsesWithBodies[0])
  );
  return diagnostics.wrap({
    __raw: httpOperation,
    kind: "http",
    path: httpOperation.path,
    verb: httpOperation.verb,
    ...parameters,
    responses,
    exceptions,
  });
}

export function isSdkHttpParameter(context: TCGCContext, type: ModelProperty): boolean {
  const program = context.program;
  return (
    isPathParam(program, type) ||
    isQueryParam(program, type) ||
    isHeader(program, type) ||
    isBody(program, type)
  );
}

interface SdkHttpParameters {
  parameters: (SdkPathParameter | SdkQueryParameter | SdkHeaderParameter)[];
  bodyParam?: SdkBodyParameter;
}

function getSdkHttpParameters(
  context: TCGCContext,
  httpOperation: HttpOperation,
  methodParameters: SdkMethodParameter[],
  responseBody?: SdkHttpResponse
): [SdkHttpParameters, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const retval: SdkHttpParameters = {
    parameters: [],
    bodyParam: undefined,
  };
  retval.parameters = httpOperation.parameters.parameters
    .filter((x) => !isNeverOrVoidType(x.param.type))
    .map((x) =>
      diagnostics.pipe(getSdkHttpParameter(context, x.param, httpOperation.operation, x.type))
    )
    .filter(
      (x): x is SdkHeaderParameter | SdkQueryParameter | SdkPathParameter =>
        x.kind === "header" || x.kind === "query" || x.kind === "path"
    );
  const headerParams = retval.parameters.filter(
    (x): x is SdkHeaderParameter => x.kind === "header"
  );
  // add operation info onto body param
  const tspBody = httpOperation.parameters.body;
  // we add correspondingMethodParams after we create the type, since we need the info on the type
  const correspondingMethodParams: SdkModelPropertyType[] = [];
  if (tspBody) {
    // if there's a param on the body, we can just rely on getSdkHttpParameter
    if (tspBody.parameter && !isNeverOrVoidType(tspBody.parameter.type)) {
      const getParamResponse = diagnostics.pipe(
        getSdkHttpParameter(context, tspBody.parameter, httpOperation.operation, "body")
      );
      if (getParamResponse.kind !== "body") {
        diagnostics.add(
          createDiagnostic({
            code: "unexpected-http-param-type",
            target: tspBody.parameter,
            format: {
              paramName: tspBody.parameter.name,
              expectedType: "body",
              actualType: getParamResponse.kind,
            },
          })
        );
        return diagnostics.wrap(retval);
      }
      retval.bodyParam = getParamResponse;
    } else if (!isNeverOrVoidType(tspBody.type)) {
      const type = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, tspBody.type, httpOperation.operation)
      );
      const name = camelCase((type as { name: string }).name ?? "body");
      retval.bodyParam = {
        kind: "body",
        name,
        nameInClient: name,
        isGeneratedName: true,
        description: getDocHelper(context, tspBody.type).description,
        details: getDocHelper(context, tspBody.type).details,
        onClient: false,
        contentTypes: [],
        defaultContentType: "application/json", // actual content type info is added later
        isApiVersionParam: false,
        apiVersions: getAvailableApiVersions(context, tspBody.type, httpOperation.operation),
        type,
        optional: false,
        correspondingMethodParams,
        crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, httpOperation.operation)}.body`,
      };
    }
    if (retval.bodyParam) {
      addContentTypeInfoToBodyParam(context, httpOperation, retval.bodyParam);
      retval.bodyParam.correspondingMethodParams = diagnostics.pipe(
        getCorrespondingMethodParams(
          context,
          httpOperation.operation,
          methodParameters,
          retval.bodyParam
        )
      );
    }
  }
  if (retval.bodyParam && !headerParams.some((h) => isContentTypeHeader(h))) {
    // if we have a body param and no content type header, we add one
    const contentTypeBase = {
      ...createContentTypeOrAcceptHeader(context, httpOperation, retval.bodyParam),
      description: `Body parameter's content type. Known values are ${retval.bodyParam.contentTypes}`,
    };
    if (!methodParameters.some((m) => m.name === "contentType")) {
      methodParameters.push({
        ...contentTypeBase,
        kind: "method",
      });
    }
    retval.parameters.push({
      ...contentTypeBase,
      kind: "header",
      serializedName: "Content-Type",
      correspondingMethodParams,
    });
  }
  if (responseBody && !headerParams.some((h) => isAcceptHeader(h))) {
    // If our operation returns a body, we add an accept header if none exist
    const acceptBase = {
      ...createContentTypeOrAcceptHeader(context, httpOperation, responseBody),
    };
    if (!methodParameters.some((m) => m.name === "accept")) {
      methodParameters.push({
        ...acceptBase,
        kind: "method",
      });
    }
    retval.parameters.push({
      ...acceptBase,
      kind: "header",
      serializedName: "Accept",
      correspondingMethodParams,
    });
  }
  for (const param of retval.parameters) {
    param.correspondingMethodParams = diagnostics.pipe(
      getCorrespondingMethodParams(context, httpOperation.operation, methodParameters, param)
    );
  }
  return diagnostics.wrap(retval);
}

function createContentTypeOrAcceptHeader(
  context: TCGCContext,
  httpOperation: HttpOperation,
  bodyObject: SdkBodyParameter | SdkHttpResponse
): Omit<SdkMethodParameter, "kind"> {
  const name = bodyObject.kind === "body" ? "contentType" : "accept";
  let type: SdkType = {
    kind: "string",
    encode: "string",
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
      kind: "constant",
      value: bodyObject.contentTypes[0],
      valueType: type,
      name: `${httpOperation.operation.name}ContentType`,
      isGeneratedName: true,
    };
  }
  // No need for clientDefaultValue because it's a constant, it only has one value
  return {
    type,
    nameInClient: name,
    name,
    isGeneratedName: true,
    apiVersions: bodyObject.apiVersions,
    isApiVersionParam: false,
    onClient: false,
    optional: false,
    crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, httpOperation.operation)}.${name}`,
  };
}

function addContentTypeInfoToBodyParam(
  context: TCGCContext,
  httpOperation: HttpOperation,
  bodyParam: SdkBodyParameter
): readonly Diagnostic[] {
  const diagnostics = createDiagnosticCollector();
  const tspBody = httpOperation.parameters.body;
  if (!tspBody) return diagnostics.diagnostics;
  let contentTypes = tspBody.contentTypes;
  if (contentTypes.length === 0) {
    contentTypes = ["application/json"];
  }
  const defaultContentType = contentTypes.includes("application/json")
    ? "application/json"
    : contentTypes[0];
  bodyParam.contentTypes = contentTypes;
  bodyParam.defaultContentType = defaultContentType;
  diagnostics.pipe(addEncodeInfo(context, bodyParam.__raw!, bodyParam.type, defaultContentType));
  return diagnostics.diagnostics;
}

export function getSdkHttpParameter(
  context: TCGCContext,
  type: ModelProperty,
  operation?: Operation,
  location?: "path" | "query" | "header" | "body"
): [SdkHttpParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const base = diagnostics.pipe(getSdkModelPropertyTypeBase(context, type, operation));
  const program = context.program;
  const correspondingMethodParams: SdkParameter[] = []; // we set it later in the operation
  if (isPathParam(context.program, type) || location === "path") {
    // we don't url encode if the type can be assigned to url
    const urlEncode = !ignoreDiagnostics(
      program.checker.isTypeAssignableTo(
        type.type.projectionBase ?? type.type,
        program.checker.getStdType("url"),
        type.type
      )
    );
    return diagnostics.wrap({
      ...base,
      kind: "path",
      urlEncode,
      serializedName: getPathParamName(program, type) ?? base.name,
      correspondingMethodParams,
      optional: false,
    });
  }
  if (isBody(context.program, type) || location === "body") {
    return diagnostics.wrap({
      ...base,
      kind: "body",
      contentTypes: ["application/json"], // will update when we get to the operation level
      defaultContentType: "application/json", // will update when we get to the operation level
      optional: type.optional,
      correspondingMethodParams,
    });
  }
  const headerQueryBase = {
    ...base,
    optional: type.optional,
    collectionFormat: getCollectionFormat(context, type),
    correspondingMethodParams,
  };
  if (isQueryParam(context.program, type) || location === "query") {
    return diagnostics.wrap({
      ...headerQueryBase,
      kind: "query",
      serializedName: getQueryParamName(program, type) ?? base.name,
    });
  }
  if (!(isHeader(context.program, type) || location === "header")) {
    diagnostics.add(
      createDiagnostic({
        code: "unexpected-http-param-type",
        target: type,
        format: {
          paramName: type.name,
          expectedType: "path, query, header, or body",
          actualType: type.kind,
        },
      })
    );
  }
  return diagnostics.wrap({
    ...headerQueryBase,
    kind: "header",
    serializedName: getHeaderFieldName(program, type) ?? base.name,
  });
}

function getSdkHttpResponseAndExceptions(
  context: TCGCContext,
  httpOperation: HttpOperation
): [
  {
    responses: Map<HttpStatusCodeRange | number, SdkHttpResponse>;
    exceptions: Map<HttpStatusCodeRange | number | "*", SdkHttpResponse>;
  },
  readonly Diagnostic[],
] {
  const diagnostics = createDiagnosticCollector();
  const responses: Map<HttpStatusCodeRange | number, SdkHttpResponse> = new Map();
  const exceptions: Map<HttpStatusCodeRange | number | "*", SdkHttpResponse> = new Map();
  for (const response of httpOperation.responses) {
    const headers: SdkServiceResponseHeader[] = [];
    let body: Type | undefined;
    let contentTypes: string[] = [];

    for (const innerResponse of response.responses) {
      for (const header of Object.values(innerResponse.headers || [])) {
        if (isNeverOrVoidType(header.type)) continue;
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
        });
      }
      if (innerResponse.body && !isNeverOrVoidType(innerResponse.body.type)) {
        if (body && body !== innerResponse.body.type) {
          diagnostics.add(
            createDiagnostic({
              code: "multiple-response-types",
              target: innerResponse.body.type,
              format: {
                operation: httpOperation.operation.name,
                response:
                  innerResponse.body.type.kind === "Model"
                    ? innerResponse.body.type.name
                    : innerResponse.body.type.kind,
              },
            })
          );
        }
        contentTypes = contentTypes.concat(innerResponse.body.contentTypes);
        body =
          innerResponse.body.type.kind === "Model"
            ? getEffectivePayloadType(context, innerResponse.body.type)
            : innerResponse.body.type;
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
      apiVersions: getAvailableApiVersions(
        context,
        httpOperation.operation,
        httpOperation.operation
      ),
    };
    if (response.statusCodes === "*" || (body && isErrorModel(context.program, body))) {
      exceptions.set(response.statusCodes, sdkResponse);
    } else {
      responses.set(response.statusCodes, sdkResponse);
    }
  }
  return diagnostics.wrap({ responses, exceptions });
}

export function getCorrespondingMethodParams(
  context: TCGCContext,
  operation: Operation,
  methodParameters: SdkParameter[],
  serviceParam: SdkHttpParameter
): [SdkModelPropertyType[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  const operationLocation = getLocationOfOperation(operation);
  if (serviceParam.isApiVersionParam) {
    const existingApiVersion = context.__namespaceToApiVersionParameter.get(operationLocation);
    if (!existingApiVersion) {
      const apiVersionParam = methodParameters.find((x) => x.name.includes("apiVersion"));
      if (!apiVersionParam) {
        diagnostics.add(
          createDiagnostic({
            code: "no-corresponding-method-param",
            target: serviceParam.__raw!,
            format: {
              paramName: "apiVersion",
              methodName: operation.name,
            },
          })
        );
        return diagnostics.wrap([]);
      }
      const apiVersionParamUpdated: SdkParameter = {
        ...apiVersionParam,
        name: "apiVersion",
        nameInClient: "apiVersion",
        isGeneratedName: apiVersionParam.name !== "apiVersion",
        optional: false,
        clientDefaultValue:
          context.__namespaceToApiVersionClientDefaultValue.get(operationLocation),
      };
      context.__namespaceToApiVersionParameter.set(operationLocation, apiVersionParamUpdated);
    }
    return diagnostics.wrap([context.__namespaceToApiVersionParameter.get(operationLocation)!]);
  }
  if (isSubscriptionId(context, serviceParam)) {
    if (!context.__subscriptionIdParameter) {
      const subscriptionIdParam = methodParameters.find((x) => isSubscriptionId(context, x));
      if (!subscriptionIdParam) {
        diagnostics.add(
          createDiagnostic({
            code: "no-corresponding-method-param",
            target: serviceParam.__raw!,
            format: {
              paramName: "subscriptionId",
              methodName: operation.name,
            },
          })
        );
        return diagnostics.wrap([]);
      }
      context.__subscriptionIdParameter = subscriptionIdParam;
    }
    return diagnostics.wrap([context.__subscriptionIdParameter]);
  }
  const correspondingMethodParameter = methodParameters.find((x) => x.name === serviceParam.name);
  if (correspondingMethodParameter) {
    return diagnostics.wrap([correspondingMethodParameter]);
  }

  const serviceParamType = serviceParam.type;
  if (serviceParam.kind === "body" && serviceParamType.kind === "model") {
    const serviceParamPropertyNames = Array.from(serviceParamType.properties.values())
      .filter((x) => x.kind === "property")
      .map((x) => x.name);
    // Here we have a spread method parameter

    // easy case is if the spread method parameter directly has the entire body as a property
    const directBodyProperty = methodParameters
      .map((x) => x.type)
      .filter((x): x is SdkModelType => x.kind === "model")
      .flatMap((x) => x.properties)
      .find((x) => x.type === serviceParamType);
    if (directBodyProperty) return diagnostics.wrap([directBodyProperty]);
    let correspondingProperties: SdkModelPropertyType[] = methodParameters.filter((x) =>
      serviceParamPropertyNames.includes(x.name)
    );
    for (const methodParam of methodParameters) {
      const methodParamIterable =
        methodParam.type.kind === "model" ? methodParam.type.properties : [methodParam];
      correspondingProperties = correspondingProperties.concat(
        methodParamIterable.filter(
          (x) =>
            serviceParamPropertyNames.includes(x.name) &&
            !correspondingProperties.find((e) => e.name === x.name)
        )
      );
    }
    if (correspondingProperties.length === serviceParamPropertyNames.length)
      return diagnostics.wrap(correspondingProperties);
    diagnostics.add(
      createDiagnostic({
        code: "no-corresponding-method-param",
        target: serviceParam.__raw!,
        format: {
          paramName: serviceParam.name,
          methodName: operation.name,
        },
      })
    );
    return diagnostics.wrap([]);
  }
  for (const methodParam of methodParameters) {
    if (methodParam.type.kind === "model") {
      for (const prop of methodParam.type.properties) {
        if (prop.name === serviceParam.name) {
          return diagnostics.wrap([prop]);
        }
      }
    }
  }
  diagnostics.add(
    createDiagnostic({
      code: "no-corresponding-method-param",
      target: serviceParam.__raw!,
      format: {
        paramName: serviceParam.name,
        methodName: operation.name,
      },
    })
  );
  return diagnostics.wrap([]);
}

function getCollectionFormat(
  context: TCGCContext,
  type: ModelProperty
): CollectionFormat | undefined {
  const program = context.program;
  const tspCollectionFormat = (
    isQueryParam(program, type)
      ? getQueryParamOptions(program, type)
      : isHeader(program, type)
        ? getHeaderFieldOptions(program, type)
        : undefined
  )?.format;
  if (tspCollectionFormat === "form" || tspCollectionFormat === "simple") {
    return undefined;
  }
  return tspCollectionFormat;
}
