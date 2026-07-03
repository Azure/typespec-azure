import { getSourceLocation, type Type } from "@typespec/compiler";
import type { HttpStatusCodesEntry } from "@typespec/http";
import type {
  CanonicalHeaderProperty,
  CanonicalHttpOperationResponse,
  CanonicalHttpPayloadBody,
  CanonicalPathProperty,
  CanonicalQueryProperty,
  HttpCanonicalization,
  ModelPropertyHttpCanonicalization,
  OperationHttpCanonicalization,
} from "@typespec/http-canonicalization";
import type { DiffKind } from "./diff-kind.js";
import type { DiffContext } from "./diff-types.js";
import { compareTypes } from "./diff-types.js";
import type { ApiDiff, DiffComponent, OperationDiffIdentity, OperationIdentity } from "./types.js";

/**
 * Compare two canonicalized operations and return all structural diffs.
 */
export function diffOperations(
  baseOp: OperationHttpCanonicalization,
  headOp: OperationHttpCanonicalization,
  identity: OperationIdentity,
): ApiDiff[] {
  const diffs: ApiDiff[] = [];

  diffs.push(...diffRequestParameters(baseOp, headOp, identity));
  diffs.push(...diffRequestBody(baseOp, headOp, identity));
  diffs.push(...diffResponses(baseOp, headOp, identity));

  return diffs;
}

function diffRequestParameters(
  baseOp: OperationHttpCanonicalization,
  headOp: OperationHttpCanonicalization,
  identity: OperationIdentity,
): ApiDiff[] {
  const diffs: ApiDiff[] = [];

  diffs.push(
    ...diffParameterGroup(
      getParametersByName(baseOp.pathParameters),
      getParametersByName(headOp.pathParameters),
      identity,
      "path",
      "RequestPathParameterAdded",
      "RequestPathParameterRemoved",
    ),
  );

  diffs.push(
    ...diffParameterGroup(
      getParametersByName(baseOp.queryParameters),
      getParametersByName(headOp.queryParameters),
      identity,
      "query",
      "RequestQueryParameterAdded",
      "RequestQueryParameterRemoved",
    ),
  );

  diffs.push(
    ...diffParameterGroup(
      getParametersByName(baseOp.requestHeaders),
      getParametersByName(headOp.requestHeaders),
      identity,
      "headers",
      "RequestHeaderAdded",
      "RequestHeaderRemoved",
    ),
  );

  return diffs;
}

function diffRequestBody(
  baseOp: OperationHttpCanonicalization,
  headOp: OperationHttpCanonicalization,
  identity: OperationIdentity,
): ApiDiff[] {
  const diffs: ApiDiff[] = [];
  const baseBodies = getBodyTypesByContentType(baseOp.requestParameters.body);
  const headBodies = getBodyTypesByContentType(headOp.requestParameters.body);

  for (const [contentType] of baseBodies) {
    if (!headBodies.has(contentType)) {
      diffs.push(
        makeDiff(
          "RequestContentTypeRemoved",
          identity,
          "request",
          "body",
          `Request content type '${contentType}' was removed.`,
          undefined,
          undefined,
          { contentType },
        ),
      );
    }
  }

  for (const [contentType] of headBodies) {
    if (!baseBodies.has(contentType)) {
      diffs.push(
        makeDiff(
          "RequestContentTypeAdded",
          identity,
          "request",
          "body",
          `Request content type '${contentType}' was added.`,
          undefined,
          undefined,
          { contentType },
        ),
      );
    }
  }

  for (const [contentType, baseBody] of baseBodies) {
    const headBody = headBodies.get(contentType);
    if (!headBody) {
      continue;
    }

    diffs.push(
      ...compareTypes(
        baseBody.type.wireType,
        headBody.type.wireType,
        createContext(identity, "request", "body"),
      ),
    );
  }

  return diffs;
}

function diffResponses(
  baseOp: OperationHttpCanonicalization,
  headOp: OperationHttpCanonicalization,
  identity: OperationIdentity,
): ApiDiff[] {
  const diffs: ApiDiff[] = [];
  const baseResponses = getResponsesByStatusCode(baseOp.responses);
  const headResponses = getResponsesByStatusCode(headOp.responses);

  for (const [statusCode] of baseResponses) {
    if (!headResponses.has(statusCode)) {
      diffs.push(
        makeDiff(
          "ResponseStatusCodeRemoved",
          identity,
          "response",
          "body",
          `Response status code '${statusCode}' was removed.`,
          undefined,
          undefined,
          { statusCode },
          statusCode,
        ),
      );
    }
  }

  for (const [statusCode] of headResponses) {
    if (!baseResponses.has(statusCode)) {
      diffs.push(
        makeDiff(
          "ResponseStatusCodeAdded",
          identity,
          "response",
          "body",
          `Response status code '${statusCode}' was added.`,
          undefined,
          undefined,
          { statusCode },
          statusCode,
        ),
      );
    }
  }

  for (const [statusCode, baseResponse] of baseResponses) {
    const headResponse = headResponses.get(statusCode);
    if (!headResponse) {
      continue;
    }

    diffs.push(...diffResponseHeaders(baseResponse, headResponse, identity, statusCode));
    diffs.push(...diffResponseBodies(baseResponse, headResponse, identity, statusCode));
  }

  return diffs;
}

function diffParameterGroup(
  baseParams: Map<string, ModelPropertyHttpCanonicalization>,
  headParams: Map<string, ModelPropertyHttpCanonicalization>,
  identity: OperationIdentity,
  group: "path" | "query" | "headers",
  addedKind: DiffKind,
  removedKind: DiffKind,
): ApiDiff[] {
  const diffs: ApiDiff[] = [];

  for (const [name, baseParam] of baseParams) {
    const elementPath = `${group}.${name}`;
    const headParam = headParams.get(name);

    if (!headParam) {
      diffs.push(
        makeDiff(
          removedKind,
          identity,
          "request",
          elementPath,
          `Request parameter '${name}' was removed from ${group}.`,
          baseParam.wireType,
          undefined,
          { name, location: group },
        ),
      );
      continue;
    }

    if (!baseParam.wireType.optional && headParam.wireType.optional) {
      diffs.push(
        makeDiff(
          "RequestParameterMadeOptional",
          identity,
          "request",
          elementPath,
          `Request parameter '${name}' was made optional.`,
          baseParam.wireType,
          headParam.wireType,
          { name, location: group },
        ),
      );
    } else if (baseParam.wireType.optional && !headParam.wireType.optional) {
      diffs.push(
        makeDiff(
          "RequestParameterMadeRequired",
          identity,
          "request",
          elementPath,
          `Request parameter '${name}' was made required.`,
          baseParam.wireType,
          headParam.wireType,
          { name, location: group },
        ),
      );
    }

    const baseParamType = getComparableType(baseParam.wireType);
    const headParamType = getComparableType(headParam.wireType);

    if (!baseParamType || !headParamType) {
      continue;
    }

    diffs.push(
      ...compareTypes(
        baseParamType,
        headParamType,
        createContext(identity, "request", elementPath),
      ),
    );
  }

  for (const [name, headParam] of headParams) {
    if (baseParams.has(name)) {
      continue;
    }

    diffs.push(
      makeDiff(
        addedKind,
        identity,
        "request",
        `${group}.${name}`,
        `Request parameter '${name}' was added to ${group}.`,
        undefined,
        headParam.wireType,
        { name, location: group },
      ),
    );
  }

  return diffs;
}

function diffResponseHeaders(
  baseResponse: CanonicalHttpOperationResponse,
  headResponse: CanonicalHttpOperationResponse,
  identity: OperationIdentity,
  statusCode: string,
): ApiDiff[] {
  const diffs: ApiDiff[] = [];
  const baseHeaders = getResponseHeadersByName(baseResponse);
  const headHeaders = getResponseHeadersByName(headResponse);

  for (const [name, baseHeader] of baseHeaders) {
    if (!headHeaders.has(name)) {
      diffs.push(
        makeDiff(
          "ResponseHeaderRemoved",
          identity,
          "response",
          `headers.${name}`,
          `Response header '${name}' was removed.`,
          baseHeader.wireType,
          undefined,
          { name },
          statusCode,
        ),
      );
    }
  }

  for (const [name, headHeader] of headHeaders) {
    if (baseHeaders.has(name)) {
      continue;
    }

    diffs.push(
      makeDiff(
        "ResponseHeaderAdded",
        identity,
        "response",
        `headers.${name}`,
        `Response header '${name}' was added.`,
        undefined,
        headHeader.wireType,
        { name },
        statusCode,
      ),
    );
  }

  return diffs;
}

function diffResponseBodies(
  baseResponse: CanonicalHttpOperationResponse,
  headResponse: CanonicalHttpOperationResponse,
  identity: OperationIdentity,
  statusCode: string,
): ApiDiff[] {
  const diffs: ApiDiff[] = [];
  const baseBodies = getResponseBodiesByContentType(baseResponse);
  const headBodies = getResponseBodiesByContentType(headResponse);

  for (const [contentType] of baseBodies) {
    if (!headBodies.has(contentType)) {
      diffs.push(
        makeDiff(
          "ResponseContentTypeRemoved",
          identity,
          "response",
          "body",
          `Response content type '${contentType}' was removed.`,
          undefined,
          undefined,
          { contentType },
          statusCode,
        ),
      );
    }
  }

  for (const [contentType] of headBodies) {
    if (!baseBodies.has(contentType)) {
      diffs.push(
        makeDiff(
          "ResponseContentTypeAdded",
          identity,
          "response",
          "body",
          `Response content type '${contentType}' was added.`,
          undefined,
          undefined,
          { contentType },
          statusCode,
        ),
      );
    }
  }

  for (const [contentType, baseBody] of baseBodies) {
    const headBody = headBodies.get(contentType);
    if (!headBody) {
      continue;
    }

    diffs.push(
      ...compareTypes(
        baseBody.type.wireType,
        headBody.type.wireType,
        createContext(identity, "response", "body", statusCode),
      ),
    );
  }

  return diffs;
}

function getParametersByName(
  params: Array<CanonicalPathProperty | CanonicalQueryProperty | CanonicalHeaderProperty>,
): Map<string, ModelPropertyHttpCanonicalization> {
  const map = new Map<string, ModelPropertyHttpCanonicalization>();

  for (const param of params) {
    const name = param.options?.name ?? param.property.sourceType?.name ?? "";
    if (name) {
      map.set(name, param.property);
    }
  }

  return map;
}

function getComparableType(type: Type | undefined): Type | undefined {
  if (!type) {
    return undefined;
  }

  return type.kind === "ModelProperty" ? type.type : type;
}

function getBodyTypesByContentType(
  body: CanonicalHttpPayloadBody | undefined,
): Map<string, { type: HttpCanonicalization }> {
  const map = new Map<string, { type: HttpCanonicalization }>();
  if (!body) {
    return map;
  }

  switch (body.bodyKind) {
    case "single":
      for (const item of body.bodies) {
        map.set(item.contentType, { type: item.type });
      }
      break;
    case "multipart":
    case "file":
      for (const contentType of body.contentTypes) {
        map.set(contentType, { type: body.type });
      }
      break;
  }

  return map;
}

function getResponsesByStatusCode(
  responses: CanonicalHttpOperationResponse[],
): Map<string, CanonicalHttpOperationResponse> {
  const map = new Map<string, CanonicalHttpOperationResponse>();

  for (const response of responses) {
    map.set(statusCodeKey(response.statusCodes), response);
  }

  return map;
}

function getResponseHeadersByName(
  response: CanonicalHttpOperationResponse,
): Map<string, ModelPropertyHttpCanonicalization> {
  const map = new Map<string, ModelPropertyHttpCanonicalization>();

  for (const content of response.responses) {
    for (const [name, header] of Object.entries(content.headers ?? {})) {
      map.set(name, header);
    }
  }

  return map;
}

function getResponseBodiesByContentType(
  response: CanonicalHttpOperationResponse,
): Map<string, { type: HttpCanonicalization }> {
  const map = new Map<string, { type: HttpCanonicalization }>();

  for (const content of response.responses) {
    for (const [contentType, body] of getBodyTypesByContentType(content.body)) {
      map.set(contentType, body);
    }
  }

  return map;
}

function statusCodeKey(statusCodes: HttpStatusCodesEntry): string {
  if (typeof statusCodes === "number") {
    return String(statusCodes);
  }

  if (statusCodes === "*") {
    return "*";
  }

  return `${statusCodes.start}-${statusCodes.end}`;
}

function createContext(
  operation: OperationIdentity,
  component: DiffComponent,
  elementPath: string,
  statusCode?: string,
): DiffContext {
  return {
    operation,
    component,
    statusCode,
    elementPath,
    visited: new Set(),
  };
}

function makeDiff(
  kind: DiffKind,
  operation: OperationIdentity,
  component: DiffComponent,
  element: string,
  message: string,
  baseType?: Type,
  headType?: Type,
  details?: Record<string, unknown>,
  statusCode?: string,
): ApiDiff {
  const identity: OperationDiffIdentity = {
    operation,
    component,
    statusCode,
    element,
  };

  return {
    kind,
    identity,
    baseType,
    headType,
    baseSourceLocation: baseType ? getSourceLocation(baseType, { locateId: true }) : undefined,
    headSourceLocation: headType ? getSourceLocation(headType, { locateId: true }) : undefined,
    details: {
      elementPath: element,
      ...details,
    },
    message,
  };
}
