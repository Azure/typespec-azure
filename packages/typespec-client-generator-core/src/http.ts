import {
  Diagnostic,
  ModelProperty,
  Type,
  createDiagnosticCollector,
  ignoreDiagnostics,
  isErrorModel,
} from "@typespec/compiler";
import {
  HttpOperation,
  HttpOperationParameter,
  HttpStatusCodeRange,
  getHeaderFieldName,
  getHeaderFieldOptions,
  getPathParamName,
  getQueryParamName,
  getQueryParamOptions,
  isBody,
  isContentTypeHeader,
  isHeader,
  isPathParam,
  isQueryParam,
} from "@typespec/http";
import {
  CollectionFormat,
  SdkBodyParameter,
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkHttpParameter,
  SdkHttpResponse,
  SdkMethodParameter,
  SdkModelPropertyType,
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
  isAcceptHeader,
  isNullable,
} from "./internal-utils.js";
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
    .map((x) => diagnostics.pipe(getSdkHttpParameter(context, x.param, {location: x.type, name: x.name})))
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
    if (tspBody.parameter) {
      const getParamResponse = diagnostics.pipe(
        getSdkHttpParameter(context, tspBody.parameter, {location: "body", name: tspBody.parameter.name})
      );
      if (getParamResponse.kind !== "body") throw new Error("blah");
      retval.bodyParam = getParamResponse;
    } else {
      const type = diagnostics.pipe(
        getClientTypeWithDiagnostics(context, tspBody.type, httpOperation.operation)
      )
      let name = "body";
      if (type.kind === "model") {
        name = type.name[0].toLowerCase() + type.name.slice(1);
      }
      retval.bodyParam = {
        kind: "body",
        name,
        nameInClient: name,
        description: getDocHelper(context, tspBody.type).description,
        details: getDocHelper(context, tspBody.type).details,
        onClient: false,
        contentTypes: [],
        defaultContentType: "application/json", // actual content type info is added later
        isApiVersionParam: false,
        apiVersions: getAvailableApiVersions(context, tspBody.type),
        type,
        optional: false,
        nullable: isNullable(tspBody.type),
        correspondingMethodParams,
      };
    }
    addContentTypeInfoToBodyParam(context, httpOperation, retval.bodyParam);
    retval.bodyParam.correspondingMethodParams = getCorrespondingMethodParams(
      context,
      methodParameters,
      retval.bodyParam
    );
  }
  if (
    retval.bodyParam &&
    !headerParams.some((h) => h.__raw && isContentTypeHeader(context.program, h.__raw))
  ) {
    // if we have a body param and no content type header, we add one
    const contentTypeBase = {
      ...createContentTypeOrAcceptHeader(retval.bodyParam),
      description: `Body parameter's content type. Known values are ${retval.bodyParam.contentTypes}`,
    };
    if (!methodParameters.some((m) => m.__raw && isContentTypeHeader(context.program, m.__raw))) {
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
      ...createContentTypeOrAcceptHeader(responseBody),
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
    param.correspondingMethodParams = getCorrespondingMethodParams(
      context,
      methodParameters,
      param
    );
  }
  return diagnostics.wrap(retval);
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

interface SdkHttpParameterOptions {
  // sometimes info about the http parameter is on the wrapping http param
  // we want to take this into account
  location?: "path" | "query" | "header" | "body";
  name?: string;
}

/**
 * This function will be called for http properties in models. If we have access to an actual http parameter, that will take precedence
 */
export function getSdkHttpParameter(
  context: TCGCContext,
  type: ModelProperty,
  options?: SdkHttpParameterOptions
): [SdkHttpParameter, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (type.sourceProperty) {
    type = type.sourceProperty;
  }
  const base = diagnostics.pipe(getSdkModelPropertyTypeBase(context, type));
  const program = context.program;
  const correspondingMethodParams: SdkParameter[] = []; // we set it later in the operation
  if (isPathParam(context.program, type) || options?.location === "path") {
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
      serializedName: options?.name ?? getPathParamName(program, type) ?? base.name,
      correspondingMethodParams,
      optional: false,
    });
  }
  if (isBody(context.program, type) || options?.location === "body") {
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
  if (isQueryParam(context.program, type) || options?.location === "query") {
    return diagnostics.wrap({
      ...headerQueryBase,
      kind: "query",
      serializedName: options?.name ?? getQueryParamName(program, type) ?? base.name,
    });
  }
  if (!(isHeader(context.program, type) || options?.location === "header")) throw new Error(`${type.name}`);
  return diagnostics.wrap({
    ...headerQueryBase,
    kind: "header",
    serializedName: options?.name ?? getHeaderFieldName(program, type) ?? base.name,
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
  methodParameters: SdkParameter[],
  serviceParam: SdkHttpParameter
): SdkModelPropertyType[] {
  if (serviceParam.isApiVersionParam) {
    if (!context.__api_version_parameter) throw new Error("No api version on the client");
    return [context.__api_version_parameter];
  }
  const correspondingMethodParameter = methodParameters.find(
    (x) =>
    x.name === serviceParam.name ||
    (x.__raw?.sourceProperty && x.__raw.sourceProperty === serviceParam.__raw) ||
    (serviceParam.__raw?.sourceProperty && serviceParam.__raw.sourceProperty === x.__raw)
  );
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
    const correspondingProperties = methodParameters.filter((x) =>
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
  for (const methodParam of methodParameters) {
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
