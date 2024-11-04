import {
  Diagnostic,
  Model,
  ModelProperty,
  Operation,
  Type,
  createDiagnosticCollector,
  getDoc,
  getSummary,
  ignoreDiagnostics,
  isErrorModel,
} from "@typespec/compiler";
import {
  HttpOperation,
  HttpOperationParameter,
  HttpOperationPathParameter,
  HttpOperationQueryParameter,
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
import { getParamAlias } from "./decorators.js";
import {
  CollectionFormat,
  SdkBodyParameter,
  SdkHeaderParameter,
  SdkHttpErrorResponse,
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
  TCGCContext,
} from "./interfaces.js";
import {
  getAvailableApiVersions,
  getHttpBodySpreadModel,
  getHttpOperationResponseHeaders,
  getLocationOfOperation,
  getTypeDecorators,
  isAcceptHeader,
  isContentTypeHeader,
  isHttpBodySpread,
  isNeverOrVoidType,
  isSubscriptionId,
  twoParamsEquivalent,
} from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";
import {
  getCrossLanguageDefinitionId,
  getEffectivePayloadType,
  getWireName,
  isApiVersion,
} from "./public-utils.js";
import {
  addEncodeInfo,
  getClientTypeWithDiagnostics,
  getSdkModelPropertyTypeBase,
  getTypeSpecBuiltInType,
} from "./types.js";

export function getSdkHttpOperation(
  context: TCGCContext,
  httpOperation: HttpOperation,
  methodParameters: SdkMethodParameter[],
): [SdkHttpOperation, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const { responses, exceptions } = diagnostics.pipe(
    getSdkHttpResponseAndExceptions(context, httpOperation),
  );
  const responsesWithBodies = [...responses.values(), ...exceptions.values()].filter((r) => r.type);
  const parameters = diagnostics.pipe(
    getSdkHttpParameters(context, httpOperation, methodParameters, responsesWithBodies[0]),
  );
  filterOutUselessPathParameters(context, httpOperation, methodParameters);
  return diagnostics.wrap({
    __raw: httpOperation,
    kind: "http",
    path: httpOperation.path,
    uriTemplate: httpOperation.uriTemplate,
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
  responseBody?: SdkHttpResponse | SdkHttpErrorResponse,
): [SdkHttpParameters, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const retval: SdkHttpParameters = {
    parameters: [],
    bodyParam: undefined,
  };

  retval.parameters = httpOperation.parameters.parameters
    .filter((x) => !isNeverOrVoidType(x.param.type))
    .map((x) =>
      diagnostics.pipe(
        getSdkHttpParameter(context, x.param, httpOperation.operation, x, x.type as any),
      ),
    )
    .filter(
      (x): x is SdkHeaderParameter | SdkQueryParameter | SdkPathParameter =>
        x.kind === "header" || x.kind === "query" || x.kind === "path",
    );
  const headerParams = retval.parameters.filter(
    (x): x is SdkHeaderParameter => x.kind === "header",
  );
  // add operation info onto body param
  const tspBody = httpOperation.parameters.body;
  // we add correspondingMethodParams after we create the type, since we need the info on the type
  const correspondingMethodParams: SdkModelPropertyType[] = [];
  if (tspBody) {
    // explicit @body and @bodyRoot
    if (tspBody.property && !isNeverOrVoidType(tspBody.property.type)) {
      const bodyParam = diagnostics.pipe(
        getSdkHttpParameter(context, tspBody.property, httpOperation.operation, undefined, "body"),
      );
      if (bodyParam.kind !== "body") {
        diagnostics.add(
          createDiagnostic({
            code: "unexpected-http-param-type",
            target: tspBody.property,
            format: {
              paramName: tspBody.property.name,
              expectedType: "body",
              actualType: bodyParam.kind,
            },
          }),
        );
        return diagnostics.wrap(retval);
      }
      retval.bodyParam = bodyParam;
    } else if (!isNeverOrVoidType(tspBody.type)) {
      const spread = isHttpBodySpread(tspBody);
      let type: SdkType;
      if (spread) {
        type = diagnostics.pipe(
          getClientTypeWithDiagnostics(
            context,
            getHttpBodySpreadModel(tspBody.type as Model),
            httpOperation.operation,
          ),
        );
      } else {
        type = diagnostics.pipe(
          getClientTypeWithDiagnostics(context, tspBody.type, httpOperation.operation),
        );
      }
      const name = camelCase((type as { name: string }).name ?? "body");
      retval.bodyParam = {
        kind: "body",
        name,
        isGeneratedName: true,
        serializedName: "body",
        doc: getDoc(context.program, tspBody.type),
        summary: getSummary(context.program, tspBody.type),
        onClient: false,
        contentTypes: [],
        defaultContentType: "application/json", // actual content type info is added later
        isApiVersionParam: false,
        apiVersions: getAvailableApiVersions(context, tspBody.type, httpOperation.operation),
        type,
        optional: false,
        correspondingMethodParams,
        crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, httpOperation.operation)}.body`,
        decorators: diagnostics.pipe(getTypeDecorators(context, tspBody.type)),
      };
    }
    if (retval.bodyParam) {
      addContentTypeInfoToBodyParam(context, httpOperation, retval.bodyParam);
      retval.bodyParam.correspondingMethodParams = diagnostics.pipe(
        getCorrespondingMethodParams(
          context,
          httpOperation.operation,
          methodParameters,
          retval.bodyParam,
        ),
      );
    }
  }
  if (retval.bodyParam && !headerParams.some((h) => isContentTypeHeader(h))) {
    // if we have a body param and no content type header, we add one
    const contentTypeBase = {
      ...createContentTypeOrAcceptHeader(context, httpOperation, retval.bodyParam),
      doc: `Body parameter's content type. Known values are ${retval.bodyParam.contentTypes}`,
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
      getCorrespondingMethodParams(context, httpOperation.operation, methodParameters, param),
    );
  }
  return diagnostics.wrap(retval);
}

function createContentTypeOrAcceptHeader(
  context: TCGCContext,
  httpOperation: HttpOperation,
  bodyObject: SdkBodyParameter | SdkHttpResponse | SdkHttpErrorResponse,
): Omit<SdkMethodParameter, "kind"> {
  const name = bodyObject.kind === "body" ? "contentType" : "accept";
  let type: SdkType = getTypeSpecBuiltInType(context, "string");
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
      decorators: [],
    };
  }
  const optional = bodyObject.kind === "body" ? bodyObject.optional : false;
  // No need for clientDefaultValue because it's a constant, it only has one value
  return {
    type,
    name,
    isGeneratedName: true,
    apiVersions: bodyObject.apiVersions,
    isApiVersionParam: false,
    onClient: false,
    optional: optional,
    crossLanguageDefinitionId: `${getCrossLanguageDefinitionId(context, httpOperation.operation)}.${name}`,
    decorators: [],
  };
}

function addContentTypeInfoToBodyParam(
  context: TCGCContext,
  httpOperation: HttpOperation,
  bodyParam: SdkBodyParameter,
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

/**
 * Generate TCGC Http parameter type, `httpParam` or `location` should be provided at least one
 * @param context
 * @param param TypeSpec param for the http parameter
 * @param operation
 * @param httpParam TypeSpec Http parameter type
 * @param location Location of the http parameter
 * @returns
 */
export function getSdkHttpParameter(
  context: TCGCContext,
  param: ModelProperty,
  operation?: Operation,
  httpParam?: HttpOperationParameter,
  location?: "path" | "query" | "header" | "body",
): [SdkHttpParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const base = diagnostics.pipe(getSdkModelPropertyTypeBase(context, param, operation));
  const program = context.program;
  const correspondingMethodParams: SdkParameter[] = []; // we set it later in the operation
  if (isPathParam(context.program, param) || location === "path") {
    // we don't url encode if the type can be assigned to url
    const urlEncode = !ignoreDiagnostics(
      program.checker.isTypeAssignableTo(
        param.type.projectionBase ?? param.type,
        program.checker.getStdType("url"),
        param.type,
      ),
    );
    return diagnostics.wrap({
      ...base,
      kind: "path",
      urlEncode,
      explode: (httpParam as HttpOperationPathParameter)?.explode ?? false,
      style: (httpParam as HttpOperationPathParameter)?.style ?? "simple",
      allowReserved: (httpParam as HttpOperationPathParameter)?.allowReserved ?? false,
      serializedName: getPathParamName(program, param) ?? base.name,
      correspondingMethodParams,
      optional: false,
    });
  }
  if (isBody(context.program, param) || location === "body") {
    return diagnostics.wrap({
      ...base,
      kind: "body",
      serializedName: param.name === "" ? "body" : getWireName(context, param),
      contentTypes: ["application/json"], // will update when we get to the operation level
      defaultContentType: "application/json", // will update when we get to the operation level
      optional: param.optional,
      correspondingMethodParams,
    });
  }
  const headerQueryBase = {
    ...base,
    optional: param.optional,
    collectionFormat: getCollectionFormat(context, param),
    correspondingMethodParams,
  };
  if (isQueryParam(context.program, param) || location === "query") {
    return diagnostics.wrap({
      ...headerQueryBase,
      kind: "query",
      serializedName: getQueryParamName(program, param) ?? base.name,
      explode: (httpParam as HttpOperationQueryParameter)?.explode,
    });
  }
  if (!(isHeader(context.program, param) || location === "header")) {
    diagnostics.add(
      createDiagnostic({
        code: "unexpected-http-param-type",
        target: param,
        format: {
          paramName: param.name,
          expectedType: "path, query, header, or body",
          actualType: param.kind,
        },
      }),
    );
  }
  return diagnostics.wrap({
    ...headerQueryBase,
    kind: "header",
    serializedName: getHeaderFieldName(program, param) ?? base.name,
  });
}

function getSdkHttpResponseAndExceptions(
  context: TCGCContext,
  httpOperation: HttpOperation,
): [
  {
    responses: SdkHttpResponse[];
    exceptions: SdkHttpErrorResponse[];
  },
  readonly Diagnostic[],
] {
  const diagnostics = createDiagnosticCollector();
  const responses: SdkHttpResponse[] = [];
  const exceptions: SdkHttpErrorResponse[] = [];
  for (const response of httpOperation.responses) {
    const headers: SdkServiceResponseHeader[] = [];
    let body: Type | undefined;
    let contentTypes: string[] = [];

    for (const innerResponse of response.responses) {
      for (const header of getHttpOperationResponseHeaders(innerResponse)) {
        if (isNeverOrVoidType(header.type)) continue;
        const clientType = diagnostics.pipe(getClientTypeWithDiagnostics(context, header.type));
        const defaultContentType = innerResponse.body?.contentTypes.includes("application/json")
          ? "application/json"
          : innerResponse.body?.contentTypes[0];
        addEncodeInfo(context, header, clientType, defaultContentType);
        headers.push({
          __raw: header,
          doc: getDoc(context.program, header),
          summary: getSummary(context.program, header),
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
            }),
          );
        }
        contentTypes = contentTypes.concat(innerResponse.body.contentTypes);
        body =
          innerResponse.body.type.kind === "Model"
            ? getEffectivePayloadType(context, innerResponse.body.type)
            : innerResponse.body.type;
      }
    }
    const sdkResponse = {
      __raw: response,
      type: body ? diagnostics.pipe(getClientTypeWithDiagnostics(context, body)) : undefined,
      headers,
      contentTypes: contentTypes.length > 0 ? contentTypes : undefined,
      defaultContentType: contentTypes.includes("application/json")
        ? "application/json"
        : contentTypes[0],
      apiVersions: getAvailableApiVersions(
        context,
        httpOperation.operation,
        httpOperation.operation,
      ),
      description: response.description,
    };
    if (response.statusCodes === "*" || (body && isErrorModel(context.program, body))) {
      exceptions.push({
        ...sdkResponse,
        kind: "http",
        statusCodes: response.statusCodes,
      });
    } else {
      responses.push({
        ...sdkResponse,
        kind: "http",
        statusCodes: response.statusCodes,
      });
    }
  }
  return diagnostics.wrap({ responses, exceptions });
}

export function getCorrespondingMethodParams(
  context: TCGCContext,
  operation: Operation,
  methodParameters: SdkParameter[],
  serviceParam: SdkHttpParameter,
): [SdkModelPropertyType[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  const operationLocation = getLocationOfOperation(operation)!;
  let clientParams = context.__clientToParameters.get(operationLocation);
  if (!clientParams) {
    clientParams = [];
    context.__clientToParameters.set(operationLocation, clientParams);
  }

  const correspondingClientParams = clientParams.filter(
    (x) =>
      twoParamsEquivalent(context, x.__raw, serviceParam.__raw) ||
      (x.__raw?.kind === "ModelProperty" && getParamAlias(context, x.__raw) === serviceParam.name),
  );
  if (correspondingClientParams.length > 0) return diagnostics.wrap(correspondingClientParams);

  if (serviceParam.isApiVersionParam && serviceParam.onClient) {
    const existingApiVersion = clientParams?.find((x) => isApiVersion(context, x));
    if (!existingApiVersion) {
      diagnostics.add(
        createDiagnostic({
          code: "no-corresponding-method-param",
          target: serviceParam.__raw!,
          format: {
            paramName: "apiVersion",
            methodName: operation.name,
          },
        }),
      );
      return diagnostics.wrap([]);
    }
    return diagnostics.wrap(clientParams.filter((x) => isApiVersion(context, x)));
  }
  if (isSubscriptionId(context, serviceParam)) {
    const subId = clientParams.find((x) => isSubscriptionId(context, x));
    if (!subId) {
      diagnostics.add(
        createDiagnostic({
          code: "no-corresponding-method-param",
          target: serviceParam.__raw!,
          format: {
            paramName: "subscriptionId",
            methodName: operation.name,
          },
        }),
      );
      return diagnostics.wrap([]);
    }
    return diagnostics.wrap(subId ? [subId] : []);
  }

  // to see if the service parameter is a method parameter or a property of a method parameter
  const directMapping = findMapping(methodParameters, serviceParam);
  if (directMapping) {
    return diagnostics.wrap([directMapping]);
  }

  // to see if all the property of service parameter could be mapped to a method parameter or a property of a method parameter
  if (serviceParam.kind === "body" && serviceParam.type.kind === "model") {
    const retVal = [];
    for (const serviceParamProp of serviceParam.type.properties) {
      const propertyMapping = findMapping(methodParameters, serviceParamProp);
      if (propertyMapping) {
        retVal.push(propertyMapping);
      }
    }
    if (retVal.length === serviceParam.type.properties.length) {
      return diagnostics.wrap(retVal);
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
    }),
  );
  return diagnostics.wrap([]);
}

function findMapping(
  methodParameters: SdkModelPropertyType[],
  serviceParam: SdkHttpParameter | SdkModelPropertyType,
): SdkModelPropertyType | undefined {
  const queue: SdkModelPropertyType[] = [...methodParameters];
  const visited: Set<SdkModelType> = new Set();
  while (queue.length > 0) {
    const methodParam = queue.shift()!;
    // http operation parameter/body parameter/property of body parameter could either from an operation parameter directly or from a property of an operation parameter
    if (
      methodParam.__raw &&
      serviceParam.__raw &&
      findRootSourceProperty(methodParam.__raw) === findRootSourceProperty(serviceParam.__raw)
    ) {
      return methodParam;
    }
    // this following two hard code mapping is for the case that TCGC help to add content type and accept header is not exist
    if (
      serviceParam.kind === "header" &&
      serviceParam.serializedName === "Content-Type" &&
      methodParam.name === "contentType"
    ) {
      return methodParam;
    }
    if (
      serviceParam.kind === "header" &&
      serviceParam.serializedName === "Accept" &&
      methodParam.name === "accept"
    ) {
      return methodParam;
    }
    if (methodParam.type.kind === "model" && !visited.has(methodParam.type)) {
      visited.add(methodParam.type);
      let current: SdkModelType | undefined = methodParam.type;
      while (current) {
        for (const prop of methodParam.type.properties) {
          queue.push(prop);
        }
        current = current.baseModel;
      }
    }
  }
  return undefined;
}

function filterOutUselessPathParameters(
  context: TCGCContext,
  httpOperation: HttpOperation,
  methodParameters: SdkMethodParameter[],
) {
  // there are some cases that method path parameter is not in operation:
  // 1. autoroute with constant parameter
  // 2. singleton arm resource name
  // 3. visibility mis-match
  // so we will remove the method parameter for consistent
  for (let i = 0; i < methodParameters.length; i++) {
    const param = methodParameters[i];
    if (
      param.__raw &&
      isPathParam(context.program, param.__raw) &&
      httpOperation.parameters.parameters.filter(
        (p) => p.type === "path" && p.name === getWireName(context, param.__raw!),
      ).length === 0
    ) {
      methodParameters.splice(i, 1);
      i--;
    }
  }
}

function findRootSourceProperty(property: ModelProperty): ModelProperty {
  while (property.sourceProperty) {
    property = property.sourceProperty;
  }
  return property;
}

function getCollectionFormat(
  context: TCGCContext,
  type: ModelProperty,
): CollectionFormat | undefined {
  const program = context.program;
  /* eslint-disable @typescript-eslint/no-deprecated */
  const tspCollectionFormat = (
    isQueryParam(program, type)
      ? getQueryParamOptions(program, type)
      : isHeader(program, type)
        ? getHeaderFieldOptions(program, type)
        : undefined
  )?.format;
  return tspCollectionFormat;
}
