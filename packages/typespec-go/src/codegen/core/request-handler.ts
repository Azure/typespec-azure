/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as naming from "../../naming/naming.js";
import { CodegenError } from "./errors.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

/**
 * emits the request handler for the specified method.
 *
 * @param azureARM indicates whether the request is for an Azure ARM service.
 * @param method the method for which to create the request handler.
 * @param imports the import manager to track required imports.
 * @param indent the indentation helper for formatting the generated code.
 * @returns the generated request handler code as a string.
 */
export function createRequestHandler(
  azureARM: boolean,
  method: go.MethodType | go.NextPageMethod,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  let name = method.name;
  if (method.kind !== "nextPageMethod") {
    name = method.naming.requestMethod;
  }

  for (const param of method.parameters) {
    if (param.location !== "method" || !go.isRequiredParameter(param.style)) {
      continue;
    }
    imports.addForType(param.type);
  }

  const returns = ["*policy.Request", "error"];
  let text = `${helpers.comment(name, "// ")} creates the ${method.name} request.\n`;
  text += `func ${helpers.getClientReceiverDefinition(method.receiver)} ${name}(${helpers.getCreateRequestParametersSig(method)}) (${returns.join(", ")}) {\n`;

  // BEGIN create request
  // pageable methods that use nextLink require special handling (e.g. reinjectable query params)
  const forNextLinkPager =
    (method.kind === "pageableMethod" || method.kind === "lroPageableMethod") &&
    method.strategy?.kind === "nextLink";
  if (forNextLinkPager) {
    text += `${indent.get()}firstPage := nextLink == ""\n`;
    text += `${indent.get()}var req *policy.Request\n`;
    text += `${indent.get()}var err error\n`;
    text += `${indent.get()}if firstPage {\n`;
    indent.push();
  }

  const hostParams = new Array<go.URIParameter>();
  for (const parameter of method.receiver.type.parameters) {
    if (parameter.kind === "uriParam") {
      hostParams.push(parameter);
    }
  }

  let hostParam: string;
  if (azureARM) {
    hostParam = "client.internal.Endpoint()";
  } else if (method.receiver.type.instance?.kind === "templatedHost") {
    imports.add("strings");
    // we have a templated host
    text += `${indent.get()}host := "${method.receiver.type.instance.path}"\n`;
    // get all the host params on the client
    for (const hostParam of hostParams) {
      text += `${indent.get()}host = strings.ReplaceAll(host, "{${hostParam.uriPathSegment}}", ${helpers.formatValue(`client.${hostParam.name}`, hostParam.type, imports)})\n`;
    }
    // check for any method local host params
    for (const param of method.parameters) {
      if (param.location === "method" && param.kind === "uriParam") {
        text += `${indent.get()}host = strings.ReplaceAll(host, "{${param.uriPathSegment}}", ${helpers.formatValue(helpers.getParamName(param), param.type, imports)})\n`;
      }
    }
    hostParam = "host";
  } else if (hostParams.length === 1) {
    // simple parameterized host case
    hostParam = "client." + hostParams[0].name;
  } else {
    throw new CodegenError(
      "InternalError",
      `no host or endpoint defined for method ${method.receiver.type.name}.${method.name}`,
    );
  }

  const methodParamGroups = helpers.getMethodParamGroups(method);
  const hasPathParams = methodParamGroups.pathParams.length > 0;

  // storage needs the client.u to be the source-of-truth for the full path.
  // however, swagger requires that all operations specify a path, which is at odds with storage.
  // to work around this, storage specifies x-ms-path paths with path params but doesn't
  // actually reference the path params (i.e. no params with which to replace the tokens).
  // so, if a path contains tokens but there are no path params, skip emitting the path.
  const pathStr = method.httpPath;
  const pathContainsParms = pathStr.includes("{");
  let opEndpoint = hostParam;
  if (hasPathParams || (!pathContainsParms && pathStr.length > 1)) {
    // there are path params, or the path doesn't contain tokens and is not "/" so emit it
    text += `${indent.get()}urlPath := "${method.httpPath}"\n`;
    opEndpoint = `runtime.JoinPaths(${hostParam}, urlPath)`;
  }

  if (hasPathParams) {
    // swagger defines path params, emit path and replace tokens
    imports.add("strings");
    // replace path parameters
    for (const pp of methodParamGroups.pathParams) {
      let paramValue: string;
      let optionalPathSep = false;
      if (pp.style === "literal") {
        // literals are always scalar types and require no empty checks
        paramValue = helpers.formatParamValue(pp, imports, indent);
      } else if (pp.location === "client" && pp.kind === "pathScalarParam" && pp.isApiVersion) {
        // path API version params have already been resolved in the constructor
        // and will never be a factory method param so we can just use the value
        paramValue = helpers.getParamName(pp);
      } else if (pp.style === "required" || pp.location === "client") {
        // NOTE: we include client params here since they behave
        // like required params (i.e. not grouped).

        // emit check to ensure path param isn't an empty string
        // NOTE: we _must_ include the empty path param check for client
        // path params even though they were already validated in the
        // ctor. this is to handle the case of client accessor methods
        // that take a path param since we can't validate it there as those
        // methods don't return an error
        if (pp.kind === "pathScalarParam") {
          // we only need to do this for params that have an underlying type of string
          if (
            (pp.type.kind === "string" || go.isConstant(pp.type, "string")) &&
            !pp.omitEmptyStringCheck
          ) {
            text += helpers.emitEmptyPathParamCheck(pp, "method", imports, indent);
          }
        }

        paramValue = helpers.formatParamValue(pp, imports, indent);

        // for collection-based path params, we emit the empty check
        // after calling helpers.formatParamValue as that will have the
        // var name that contains the slice.
        if (pp.kind === "pathCollectionParam") {
          const paramName = helpers.getParamName(pp);
          const joinedParamName = `${paramName}Param`;
          text += `${indent.get()}${joinedParamName} := ${paramValue}\n`;
          imports.add("errors");
          text += `${indent.get()}if len(${joinedParamName}) == 0 {\n`;
          text += `${indent.push().get()}return nil, errors.New("parameter ${paramName} cannot be empty")\n`;
          text += `${indent.pop().get()}}\n`;
          paramValue = joinedParamName;
        }
      } else if (go.isClientSideDefault(pp.style)) {
        const defaultValue = naming.uncapitalize(pp.name) + "Default";
        text += `${indent.get()}${defaultValue} := ${helpers.formatLiteralValue(pp.style.defaultValue, true)}\n`;
        text += emitParamGroupCheck(pp, indent);
        text += `${indent.push().get()}${defaultValue} = ${helpers.getParamName(pp)}\n`;
        text += `${indent.pop().get()}}\n`;
        // we've created a local var with the underlying type of the
        // optional param, so we must unwrap before assigning the value
        // to prevent attempting to dereference it.
        paramValue = helpers.formatValue(defaultValue, go.unwrapPtr(pp.type), imports);
      } else {
        // param isn't required, so emit a local var with
        // the correct default value, then populate it with
        // the optional value when set.
        paramValue = `optional${naming.capitalize(pp.name)}`;
        text += `${indent.get()}${paramValue} := ""\n`;
        text += emitParamGroupCheck(pp, indent);
        text += `${indent.push().get()}${paramValue} = ${helpers.formatParamValue(pp, imports, indent)}\n`;
        text += `${indent.pop().get()}}\n`;

        // there are two cases for optional path params.
        //  - /foo/bar/{optional}
        //  - /foo/bar{/optional}
        // for the second case, we need to include a forward slash
        if (method.httpPath[method.httpPath.indexOf(`{${pp.pathSegment}}`) - 1] !== "/") {
          optionalPathSep = true;
        }
      }

      if (optionalPathSep) {
        text += `${indent.get()}if len(${paramValue}) > 0 {\n`;
        text += `${indent.push().get()}${paramValue} = "/"+${emitPathEscape(pp, paramValue, imports)}\n`;
        text += `${indent.pop().get()}}\n`;
      } else {
        paramValue = emitPathEscape(pp, paramValue, imports);
      }

      text += `${indent.get()}urlPath = strings.ReplaceAll(urlPath, "{${pp.pathSegment}}", ${paramValue})\n`;
    }
  }

  text += `${indent.get()}req, err ${forNextLinkPager ? "=" : ":="} runtime.NewRequest(ctx, http.Method${naming.capitalize(method.httpMethod)}, ${opEndpoint})\n`;
  if (forNextLinkPager) {
    text += `${indent.pop().get()}} else {\n`;
    text += `${indent.push().get()}req, err = runtime.NewRequestForNextLink(ctx, http.Method${naming.capitalize(method.nextLinkVerb)}, ${hostParam}, nextLink)\n`;
    text += `${indent.pop().get()}}\n`;
  }
  text += `${indent.get()}if err != nil {\n`;
  text += `${indent.push().get()}return nil, err\n`;
  text += `${indent.pop().get()}}\n`;
  // END create request

  // BEGIN add query parameters
  const encodedParams = methodParamGroups.encodedQueryParams;
  const unencodedParams = methodParamGroups.unencodedQueryParams;

  // check for any params that require reinjection
  const reinjectedParams = new Array<go.QueryParameter>();
  if (forNextLinkPager && method.strategy?.kind === "nextLink") {
    reinjectedParams.push(...method.strategy.reinjectedParams);
  }

  // tracks if we're inside an "if firstPage {}" block so we can close it at the end
  let inIfFirstPage = false;

  // emit encoded params first
  if (encodedParams.length > 0) {
    // determine the query params for reinjection.
    // default to "all" to cover the non-pager case.
    let forReinjection: "all" | "none" | "some" = "all";
    if (forNextLinkPager) {
      if (reinjectedParams.length === 0) {
        forReinjection = "none";
      } else if (reinjectedParams.length < encodedParams.length) {
        forReinjection = "some";
      }
    }

    if (forReinjection === "none") {
      // no params to be reinjected, shove everything into "if firstPage {}" block
      text += `${indent.get()}if firstPage {\n`;
      indent.push();
      inIfFirstPage = true;
    }

    text += `${indent.get()}reqQP := req.Raw().URL.Query()\n`;

    // this will accumulate any non-reinjected params code
    let nonReinjectedParamsText = "";

    // we emit all reinjected params in the loop, and collect the code for non-reinjected params
    for (const qp of encodedParams.sort((a: go.QueryParameter, b: go.QueryParameter) => {
      return helpers.sortAscending(a.queryParameter, b.queryParameter);
    })) {
      let setter: string;
      if (qp.kind === "queryCollectionParam" && qp.collectionFormat === "multi") {
        setter = `for _, qv := range ${helpers.getParamName(qp)} {\n`;

        // emit a type conversion for the qv based on the array's element type
        let queryVal: string;
        const arrayQP = qp.type;
        switch (arrayQP.elementType.kind) {
          case "constant":
            switch (arrayQP.elementType.type) {
              case "string":
                queryVal = "string(qv)";
                break;
              default:
                imports.add("fmt");
                queryVal = 'fmt.Sprintf("%d", qv)';
            }
            break;
          case "string":
            queryVal = "qv";
            break;
          default:
            imports.add("fmt");
            queryVal = 'fmt.Sprintf("%v", qv)';
        }

        setter += `${indent.push().get()}reqQP.Add("${qp.queryParameter}", ${queryVal})\n`;
        setter += `${indent.pop().get()}}`;
      } else {
        // cannot initialize setter to this value as helpers.formatParamValue() can change imports
        setter = `reqQP.Set("${qp.queryParameter}", ${helpers.formatParamValue(qp, imports, indent)})`;
      }

      const qpText = emitQueryParam(qp, imports, indent, setter);

      // if we're not reinjecting any params, or this param is for reinjection
      // then emit it now, else collect it for the non-reinjected case.
      if (forReinjection !== "some" || reinjectedParams.includes(qp)) {
        text += qpText;
      } else {
        nonReinjectedParamsText += qpText;
      }
    }

    if (forReinjection === "some") {
      if (nonReinjectedParamsText.length === 0) {
        throw new CodegenError("InternalError", "missing query parameters for reinjection");
      }
      // the indentation for nonReinjectedParamsText won't line up but gofmt fixes it
      text += `${indent.get()}if firstPage {\n`;
      text += nonReinjectedParamsText;
      text += `${indent.get()}}\n`;
    }

    // reqQP.Encode() encodes space chars as '+' which is application/x-www-form-urlencoded
    // thus not applicable for URIs. the correct URI encoding for SP is %20. note that literal '+'
    // characters are encoded by reqQP.Encode() as %2B so there's no risk of replacing them.
    // see https://www.rfc-editor.org/rfc/rfc3986 sections 2.1, 2.2, and 3.4
    imports.add("strings");
    text += `${indent.get()}req.Raw().URL.RawQuery = strings.ReplaceAll(reqQP.Encode(), "+", "%20")\n`;

    // don't close it yet if there are header/body params as those don't get reinjected
    const bodyParam = methodParamGroups.bodyParam;
    const formBodyParams = methodParamGroups.formBodyParams;
    const multipartBodyParams = methodParamGroups.multipartBodyParams;
    const partialBodyParams = methodParamGroups.partialBodyParams;
    const hasBodyParam =
      bodyParam ||
      formBodyParams.length > 0 ||
      multipartBodyParams.length > 0 ||
      partialBodyParams.length > 0;
    if (forReinjection === "none" && methodParamGroups.headerParams.length === 0 && !hasBodyParam) {
      // closing brace for the "if firstPage {}" block
      text += `${indent.pop().get()}}\n`;
      inIfFirstPage = false;
    }
  }

  // tack on any unencoded params to the end
  // TODO: this was from OpenAPI support as tsp can't describe this at present. remove?
  if (unencodedParams.length > 0) {
    if (encodedParams.length > 0) {
      text += `${indent.get()}unencodedParams := []string{req.Raw().URL.RawQuery}\n`;
    } else {
      text += `${indent.get()}unencodedParams := []string{}\n`;
    }
    for (const qp of unencodedParams.sort((a: go.QueryParameter, b: go.QueryParameter) => {
      return helpers.sortAscending(a.queryParameter, b.queryParameter);
    })) {
      let setter: string;
      if (qp.kind === "queryCollectionParam" && qp.collectionFormat === "multi") {
        setter = `for _, qv := range ${helpers.getParamName(qp)} {\n`;
        setter += `${indent.push().get()}unencodedParams = append(unencodedParams, "${qp.queryParameter}="+qv)\n`;
        setter += `${indent.pop().get()}}`;
      } else {
        setter = `unencodedParams = append(unencodedParams, "${qp.queryParameter}="+${helpers.formatParamValue(qp, imports, indent)})`;
      }
      text += emitQueryParam(qp, imports, indent, setter);
    }
    imports.add("strings");
    text += `${indent.get()}req.Raw().URL.RawQuery = strings.Join(unencodedParams, "&")\n`;
  }
  // END add query parameters

  if (method.kind !== "nextPageMethod" && method.returns.result?.kind === "binaryResult") {
    // skip auto-body downloading for binary stream responses
    text += `${indent.get()}runtime.SkipBodyDownload(req)\n`;
  }

  // BEGIN specific request headers
  if (forNextLinkPager && methodParamGroups.headerParams.length > 0 && !inIfFirstPage) {
    // header params are never reinjected
    text += `${indent.get()}if firstPage {\n`;
    indent.push();
    inIfFirstPage = true;
  }

  let contentType: string | undefined;
  for (const param of methodParamGroups.headerParams.sort(
    (a: go.HeaderParameter, b: go.HeaderParameter) => {
      return helpers.sortAscending(a.headerName, b.headerName);
    },
  )) {
    if (param.headerName.match(/^content-type$/i)) {
      // canonicalize content-type as req.SetBody checks for it via its canonicalized name :(
      param.headerName = "Content-Type";

      // there's a corner case where we have a content-type param with no body
      // param. for this case we still need to set the header inline.
      const bodyParam = methodParamGroups.bodyParam;
      if (bodyParam?.bodyFormat === "binary" || bodyParam?.bodyFormat === "Text") {
        // if the content-type is from a param, then the param will be passed
        // explicitly to runtime.SetBody() so don't emit code to set it inline.
        // NOTE: only binary/text payloads call runtime.SetBody().
        if (go.isClientSideDefault(param.style)) {
          text += emitClientSideDefault(
            param as go.HeaderScalarParameter,
            param.style,
            imports,
            indent,
            () => "",
          );
          continue;
        } else if (param.style === "required") {
          continue;
        }
      }
    }

    if (param.headerName === "Content-Type" && param.style === "literal") {
      // the content-type header will be set as part of emitSetBodyWithErrCheck
      // to handle cases where the body param is optional. we don't want to set
      // the content-type if the body is nil.
      // we do it like this as tsp specifies content-type while swagger does not.
      contentType = helpers.formatParamValue(param, imports, indent);
    } else if (
      go.isRequiredParameter(param.style) ||
      go.isLiteralParameter(param.style) ||
      go.isClientSideDefault(param.style)
    ) {
      text += emitHeaderSet(param, imports, indent);
    } else if (param.location === "client" && !param.group) {
      // global optional param
      text += `${indent.get()}if client.${param.name} != nil {\n`;
      indent.push();
      text += emitHeaderSet(param, imports, indent);
      indent.pop();
      text += `${indent.get()}}\n`;
    } else {
      text += emitParamGroupCheck(param, indent);
      indent.push();
      text += emitHeaderSet(param, imports, indent);
      indent.pop();
      text += `${indent.get()}}\n`;
    }
  }
  // END specific request headers

  // BEGIN set body
  const body = emitBody(method, methodParamGroups, imports, indent, contentType);
  if (body) {
    if (forNextLinkPager && !inIfFirstPage) {
      // body params are never reinjected
      text += `${indent.get()}if firstPage {\n`;
      indent.push();
      inIfFirstPage = true;
    }
    text += `${indent.get()}${body}`;
  }
  // END set body

  if (inIfFirstPage) {
    text += `${indent.pop().get()}}\n`;
  }

  text += `${indent.get()}return req, nil\n`;
  text += "}\n\n";
  return text;
}

function emitBody(
  method: go.MethodType | go.NextPageMethod,
  methodParamGroups: helpers.MethodParamGroups,
  imports: ImportManager,
  indent: helpers.Indentation,
  contentType?: string,
): string | undefined {
  // note that these are mutually exclusive
  const bodyParam = methodParamGroups.bodyParam;
  const formBodyParams = methodParamGroups.formBodyParams;
  const multipartBodyParams = methodParamGroups.multipartBodyParams;
  const partialBodyParams = methodParamGroups.partialBodyParams;

  let text = "";
  if (bodyParam) {
    if (bodyParam.bodyFormat === "JSON" || bodyParam.bodyFormat === "XML") {
      // default to the body param name
      let body = helpers.getParamName(bodyParam);
      if (bodyParam.type.kind === "literal") {
        // if the value is constant, embed it directly
        body = helpers.formatLiteralValue(bodyParam.type, true);
      } else if (bodyParam.bodyFormat === "XML" && bodyParam.type.kind === "slice") {
        // for XML payloads, create a wrapper type if the payload is an array
        imports.add("encoding/xml");
        text += `${indent.get()}type wrapper struct {\n`;
        indent.push();
        let tagName: string;
        if (bodyParam.xml?.wrapper) {
          tagName = bodyParam.xml.wrapper;
        } else {
          tagName = go.getTypeDeclaration(bodyParam.type, method.receiver.type.pkg);
        }
        text += `${indent.get()}XMLName xml.Name \`xml:"${tagName}"\`\n`;
        const fieldName = naming.capitalize(bodyParam.name);
        let tag = go.getTypeDeclaration(bodyParam.type.elementType, method.receiver.type.pkg);
        if (bodyParam.type.elementType.kind === "model" && bodyParam.type.elementType.xml?.name) {
          tag = bodyParam.type.elementType.xml.name;
        }
        text += `${indent.get()}${fieldName} *${go.getTypeDeclaration(bodyParam.type, method.receiver.type.pkg)} \`xml:"${tag}"\`\n`;
        text += `${indent.pop().get()}}\n`;
        body = `wrapper{${fieldName}: &${body}}`;
      } else if (bodyParam.type.kind === "time") {
        // utc datetimes are normalized to UTC before serialization. non-RFC3339
        // formats are wrapped in the internal time type; RFC3339 relies on the
        // default time.Time JSON marshaler so it only needs the UTC conversion.
        const bodyVal = bodyParam.type.utc ? `${body}.UTC()` : body;
        if (bodyParam.type.format !== "RFC3339") {
          imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime/datetime");
          body = `datetime.${bodyParam.type.format}(${bodyVal})`;
        } else {
          body = bodyVal;
        }
      } else if (
        go.isSlice(bodyParam.type, "time") &&
        isSliceOfTimeForMarshalling(bodyParam.type)
      ) {
        const timeType = go.unwrapPtr(bodyParam.type.elementType);
        const elementPtr = bodyParam.type.elementType.kind === "ptr" ? "*" : "";
        imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime/datetime");
        text += `${indent.get()}aux := make([]${elementPtr}datetime.${timeType.format}, len(${body}))\n`;
        text += `${indent.get()}for i := 0; i < len(${body}); i++ {\n`;
        if (timeType.utc && elementPtr === "*") {
          text += `${indent.push().get()}if ${body}[i] != nil {\n`;
          text += `${indent.push().get()}utcTime := ${body}[i].UTC()\n`;
          text += `${indent.get()}aux[i] = (*datetime.${timeType.format})(&utcTime)\n`;
          text += `${indent.pop().get()}}\n`;
          indent.pop();
        } else {
          const utcCall = timeType.utc ? ".UTC()" : "";
          text += `${indent.push().get()}aux[i] = (${elementPtr}datetime.${timeType.format})(${body}[i]${utcCall})\n`;
          indent.pop();
        }
        text += `${indent.get()}}\n`;
        body = "aux";
      } else if (go.isMap(bodyParam.type, "time")) {
        const timeType = bodyParam.type.valueType.ptrType;
        imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime/datetime");
        text += `${indent.get()}aux := map[string]*datetime.${timeType.format}{}\n`;
        text += `${indent.get()}for k, v := range ${body} {\n`;
        if (timeType.utc) {
          text += `${indent.push().get()}if v != nil {\n`;
          text += `${indent.push().get()}utcTime := v.UTC()\n`;
          text += `${indent.get()}aux[k] = (*datetime.${timeType.format})(&utcTime)\n`;
          text += `${indent.pop().get()}} else {\n`;
          text += `${indent.push().get()}aux[k] = nil\n`;
          text += `${indent.pop().get()}}\n`;
          indent.pop();
        } else {
          text += `${indent.push().get()}aux[k] = (*datetime.${timeType.format})(v)\n`;
          indent.pop();
        }
        text += `${indent.get()}}\n`;
        body = "aux";
      }

      let setBody = `runtime.MarshalAs${helpers.getMediaFormat(bodyParam.type, bodyParam.bodyFormat, `req, ${body}`)}`;
      if (bodyParam.type.kind === "rawJSON") {
        imports.add("bytes");
        imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming");
        setBody = `req.SetBody(streaming.NopCloser(bytes.NewReader(${body})), "application/${bodyParam.bodyFormat.toLowerCase()}")`;
      }
      if (go.isRequiredParameter(bodyParam.style) || go.isLiteralParameter(bodyParam.style)) {
        text += emitSetBodyWithErrCheck(setBody, indent, contentType);
      } else {
        text += emitParamGroupCheck(bodyParam, indent);
        indent.push();
        text += emitSetBodyWithErrCheck(setBody, indent, contentType);
        text += `${indent.get()}return req, nil\n`;
        indent.pop();
        text += `${indent.get()}}\n`;
      }
    } else if (bodyParam.bodyFormat === "binary") {
      if (go.isRequiredParameter(bodyParam.style)) {
        text += emitSetBodyWithErrCheck(
          `req.SetBody(${bodyParam.name}, ${getContentTypeValue(method, bodyParam.contentType)})`,
          indent,
          contentType,
        );
      } else {
        text += emitParamGroupCheck(bodyParam, indent);
        indent.push();
        text += emitSetBodyWithErrCheck(
          `req.SetBody(${helpers.getParamName(bodyParam)}, ${getContentTypeValue(method, bodyParam.contentType)})`,
          indent,
          contentType,
        );
        text += `${indent.get()}return req, nil\n`;
        indent.pop();
        text += `${indent.get()}}\n`;
      }
    } else if (bodyParam.bodyFormat === "Text") {
      imports.add("strings");
      imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming");
      const body = helpers.formatParamValue(bodyParam, imports, indent);
      if (go.isRequiredParameter(bodyParam.style)) {
        text += `${indent.get()}body := streaming.NopCloser(strings.NewReader(${body}))\n`;
        text += emitSetBodyWithErrCheck(
          `req.SetBody(body, ${getContentTypeValue(method, bodyParam.contentType)})`,
          indent,
          contentType,
        );
      } else {
        text += emitParamGroupCheck(bodyParam, indent);
        indent.push();
        text += `${indent.get()}body := streaming.NopCloser(strings.NewReader(${body}))\n`;
        text += emitSetBodyWithErrCheck(
          `req.SetBody(body, ${getContentTypeValue(method, bodyParam.contentType)})`,
          indent,
          contentType,
        );
        text += `${indent.get()}return req, nil\n`;
        indent.pop();
        text += `${indent.get()}}\n`;
      }
    }
    return text;
  } else if (partialBodyParams.length > 0) {
    // partial body params are discrete params that are all fields within an internal struct.
    // define and instantiate an instance of the wire type, using the values from each param.
    text += `${indent.get()}body := struct {\n`;
    indent.push();
    for (const partialBodyParam of partialBodyParams) {
      text += `${indent.get()}${naming.capitalize(partialBodyParam.serializedName)} ${go.getTypeDeclaration(partialBodyParam.type, method.receiver.type.pkg)} \`${partialBodyParam.format.toLowerCase()}:"${partialBodyParam.serializedName}"\`\n`;
    }
    indent.pop();
    text += `${indent.get()}}{\n`;
    indent.push();
    // required params are emitted as initializers in the struct literal
    for (const partialBodyParam of partialBodyParams) {
      if (go.isRequiredParameter(partialBodyParam.style)) {
        text += `${indent.get()}${naming.capitalize(partialBodyParam.serializedName)}: ${naming.uncapitalize(partialBodyParam.name)},\n`;
      }
    }
    indent.pop();
    text += `${indent.get()}}\n`;
    // now populate any optional params from the options type
    for (const partialBodyParam of partialBodyParams) {
      if (!go.isRequiredParameter(partialBodyParam.style)) {
        text += emitParamGroupCheck(partialBodyParam, indent);
        text += `${indent.push().get()}body.${naming.capitalize(partialBodyParam.serializedName)} = options.${naming.capitalize(partialBodyParam.name)}\n`;
        text += `${indent.pop().get()}}\n`;
      }
    }
    // TODO: spread params are JSON only https://github.com/Azure/typespec-azure/issues/4949
    text += `${indent.get()}req.Raw().Header["Content-Type"] = []string{"application/json"}\n`;
    text += `${indent.get()}if err := runtime.MarshalAsJSON(req, body); err != nil {\n`;
    text += `${indent.push().get()}return nil, err\n`;
    text += `${indent.pop().get()}}\n`;
    return text;
  } else if (multipartBodyParams.length > 0) {
    // emit content type setters for direct MultipartContent params with a fixed content type.
    // this handles the case where the param itself is a MultipartContent or a slice of them
    // (i.e. not wrapped in a model struct with toMultipartFormData()).
    // note that tsp only allows homogeneous content types, which is why it's safe
    // to unwrap the first param's type and check its contentType field.
    text += emitMultipartContentTypeSetter(
      multipartBodyParams[0].name,
      multipartBodyParams[0].type,
      indent,
    );
    if (
      multipartBodyParams.length === 1 &&
      multipartBodyParams[0].type.kind === "model" &&
      multipartBodyParams[0].type.annotations.multipartFormData
    ) {
      // emit content type setters for model fields that have a fixed content type.
      // toMultipartFormData() converts the model to map[string]any but doesn't set ContentType,
      // so we must set it on each MultipartContent field before the conversion.
      for (const field of multipartBodyParams[0].type.fields) {
        text += emitMultipartContentTypeSetter(
          `${multipartBodyParams[0].name}.${field.name}`,
          field.type,
          indent,
        );
      }
      text += `${indent.get()}formData, err := ${multipartBodyParams[0].name}.toMultipartFormData()\n`;
      text += `${indent.get()}if err != nil {\n`;
      text += `${indent.push().get()}return nil, err\n`;
      text += `${indent.pop().get()}}\n`;
    } else {
      text += `${indent.get()}formData := map[string]any{}\n`;
      for (const param of multipartBodyParams) {
        const setter = `formData["${param.name}"] = ${helpers.getParamName(param)}`;
        if (go.isRequiredParameter(param.style)) {
          text += `${indent.get()}${setter}\n`;
        } else {
          text += emitParamGroupCheck(param, indent);
          text += `${indent.push().get()}${setter}\n`;
          text += `${indent.pop().get()}}\n`;
        }
      }
    }
    text += `${indent.get()}if err := runtime.SetMultipartFormData(req, formData); err != nil {\n`;
    text += `${indent.push().get()}return nil, err\n`;
    text += `${indent.pop().get()}}\n`;
    return text;
  } else if (formBodyParams.length > 0) {
    imports.add("net/url");
    imports.add("strings");
    imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming");
    text += `${indent.get()}formData := url.Values{}\n`;
    // find all the form body params
    for (const param of formBodyParams) {
      const setter = `formData.Set("${param.formDataName}", ${helpers.formatParamValue(param, imports, indent)})`;
      if (go.isRequiredParameter(param.style)) {
        text += `${indent.get()}${setter}\n`;
      } else {
        text += emitParamGroupCheck(param, indent);
        text += `${indent.push().get()}${setter}\n`;
        text += `${indent.pop().get()}}\n`;
      }
    }
    text += `${indent.get()}body := streaming.NopCloser(strings.NewReader(formData.Encode()))\n`;
    text += emitSetBodyWithErrCheck(
      'req.SetBody(body, "application/x-www-form-urlencoded")',
      indent,
    );
    return text;
  } else {
    // no body
    return undefined;
  }
}

/**
 * emits code for handling parameters with a client-side default
 *
 * @param param the param with a client-side default
 * @param csd the client-side default value
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @param setterFormat any custom formatting for the value
 * @returns the code for handling the client-side default
 */
function emitClientSideDefault(
  param: go.HeaderCollectionParameter | go.HeaderScalarParameter | go.QueryParameter,
  csd: go.ClientSideDefault,
  imports: ImportManager,
  indent: helpers.Indentation,
  setterFormat: (name: string, val: string) => string,
): string {
  const defaultVar = getClientSideDefaultVarName(param);
  let text = `${indent.get()}${defaultVar} := ${helpers.formatLiteralValue(csd.defaultValue, true)}\n`;
  text += `${indent.get()}if options != nil && options.${naming.capitalize(param.name)} != nil {\n`;
  text += `${indent.push().get()}${defaultVar} = *options.${naming.capitalize(param.name)}\n`;
  text += `${indent.pop().get()}}\n`;

  let serializedName: string;
  switch (param.kind) {
    case "headerCollectionParam":
    case "headerScalarParam":
      serializedName = param.headerName;
      break;
    case "queryCollectionParam":
    case "queryScalarParam":
      serializedName = param.queryParameter;
      break;
  }

  // we've created a local var with the underlying type of the
  // optional param, so we must unwrap before assigning the value
  // to prevent attempting to dereference it.
  const setterFormatText = setterFormat(
    `"${serializedName}"`,
    helpers.formatValue(defaultVar, go.unwrapPtr(param.type), imports),
  );
  text += setterFormatText;
  // setterFormat can return the empty string in some cases.
  // if it does, there's no need for an extra new-line char.
  if (setterFormatText.length > 0) {
    text += "\n";
  }
  return text;
}

/**
 * emits code for setting a header from a parameter.
 * it includes handling for client-side defaults.
 *
 * @param headerParam the header param to be set
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the code for setting a header
 */
function emitHeaderSet(
  headerParam: go.HeaderParameter,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  if (headerParam.kind === "headerMapParam") {
    let headerText = `${indent.get()}for k, v := range ${helpers.getParamName(headerParam)} {\n`;
    headerText += `${indent.push().get()}if v != nil {\n`;
    headerText += `${indent.push().get()}req.Raw().Header["${headerParam.headerName}"+k] = []string{*v}\n`;
    headerText += `${indent.pop().get()}}\n`;
    headerText += `${indent.pop().get()}}\n`;
    return headerText;
  } else if (headerParam.location === "method" && go.isClientSideDefault(headerParam.style)) {
    return emitClientSideDefault(headerParam, headerParam.style, imports, indent, (name, val) => {
      return `${indent.get()}req.Raw().Header[${name}] = []string{${val}}`;
    });
  } else {
    return `${indent.get()}req.Raw().Header["${headerParam.headerName}"] = []string{${helpers.formatParamValue(headerParam, imports, indent)}}\n`;
  }
}

/**
 * emits code to URL escape a path parameter as required.
 * the param name is a discrete param instead of param.name
 * to handle cases where the param value was stored in a
 * local variable.
 *
 * @param pp the path parameter
 * @param paramName the path parameter var name
 * @param imports the import manager currently in scope
 * @returns the code that escaped the param or the param
 */
function emitPathEscape(pp: go.PathParameter, paramName: string, imports: ImportManager): string {
  if (pp.isEncoded) {
    imports.add("net/url");
    return `url.PathEscape(${paramName})`;
  }
  return paramName;
}

/**
 * emits Go code to set ContentType on a MultipartContent variable if it has a fixed content type.
 * handles both direct MultipartContent and slices of MultipartContent.
 * returns the empty string if there's nothing to set.
 *
 * @param paramName the name of the multipart param
 * @param wireType the underlying type of the multipart param
 * @param indent the indentation helper currently in scope
 * @returns setter code or the empty string
 */
function emitMultipartContentTypeSetter(
  paramName: string,
  wireType: go.WireType,
  indent: helpers.Indentation,
): string {
  let text = "";
  const unwrapped = helpers.recursiveUnwrapMapSlice(wireType);
  if (unwrapped.kind !== "multipartContent" || !unwrapped.contentType) {
    return text;
  }
  switch (wireType.kind) {
    case "multipartContent":
      text += `${indent.get()}${paramName}.ContentType = ${unwrapped.contentType.literal}\n`;
      break;
    case "slice":
      text += `${indent.get()}for i := range ${paramName} {\n`;
      text += `${indent.push().get()}${paramName}[i].ContentType = ${unwrapped.contentType.literal}\n`;
      text += `${indent.pop().get()}}\n`;
      break;
  }
  return text;
}

/**
 * helper to build nil checks for param groups.
 * this requires that param.group contains a ParameterGroup.
 * it assumes that the provided param is optional.
 *
 * @param param the parameter for which to build the nil check
 * @param indent the indentation helper currently in scope
 * @returns the code for checking the param group for nil
 */
function emitParamGroupCheck(param: go.MethodParameter, indent: helpers.Indentation): string {
  if (!param.group) {
    throw new CodegenError(
      "InternalError",
      `emitParamGroupCheck called for ungrouped parameter ${param.name}`,
    );
  }
  let client = "";
  if (param.location === "client") {
    client = "client.";
  }
  const paramGroupName = naming.uncapitalize(param.group.name);
  let optionalParamGroupCheck = `${client}${paramGroupName} != nil && `;
  if (param.group.required) {
    optionalParamGroupCheck = "";
  }
  return `${indent.get()}if ${optionalParamGroupCheck}${client}${paramGroupName}.${naming.capitalize(param.name)} != nil {\n`;
}

/**
 * emits code for setting a query parameter.
 * it handles nil checks and client-side defaults.
 *
 * @param qp the query param to be set
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @param setter the adjacent code for setting the query param
 * @returns the code for setting the query param
 */
function emitQueryParam(
  qp: go.QueryParameter,
  imports: ImportManager,
  indent: helpers.Indentation,
  setter: string,
): string {
  let qpText: string;
  if (qp.location === "method" && go.isClientSideDefault(qp.style)) {
    qpText = emitClientSideDefault(qp, qp.style, imports, indent, (name, val) => {
      return `${indent.get()}reqQP.Set(${name}, ${val})`;
    });
  } else if (
    go.isRequiredParameter(qp.style) ||
    go.isLiteralParameter(qp.style) ||
    (qp.location === "client" && go.isClientSideDefault(qp.style))
  ) {
    qpText = `${indent.get()}${setter}\n`;
  } else if (qp.location === "client" && !qp.group) {
    // global optional param
    qpText = `${indent.get()}if client.${qp.name} != nil {\n`;
    qpText += `${indent.push().get()}${setter}\n`;
    qpText += `${indent.pop().get()}}\n`;
  } else {
    qpText = emitParamGroupCheck(qp, indent);
    qpText += `${indent.push().get()}${setter}\n`;
    qpText += `${indent.pop().get()}}\n`;
  }
  return qpText;
}

/**
 * emits code for setting the request body and checking the resultant error.
 * it's assumed that setBodyExpr is a function call that returns an error.
 * also sets the Content-Type header as required.
 *
 * @param setBodyExpr the expression for setting the body
 * @param indent the indentation helper currently in scope
 * @param contentType optional value for setting the Content-Type header
 * @returns the code for setting the body
 */
function emitSetBodyWithErrCheck(
  setBodyExpr: string,
  indent: helpers.Indentation,
  contentType?: string,
): string {
  let content = "";
  if (contentType) {
    content += `${indent.get()}req.Raw().Header["Content-Type"] = []string{${contentType}}\n`;
  }
  content += `${indent.get()}if err := ${setBodyExpr}; err != nil {\n`;
  content += `${indent.push().get()}return nil, err\n`;
  content += `${indent.pop().get()}}\n`;
  return content;
}

/**
 * returns the var name to use for a param's client-side default value
 *
 * @param param the param for which to name the var
 * @returns the var name
 */
function getClientSideDefaultVarName(
  param: go.HeaderCollectionParameter | go.HeaderScalarParameter | go.QueryParameter,
): string {
  return naming.uncapitalize(param.name) + "Default";
}

/**
 * returns the source value for the Content-Type header
 *
 * @param method the method for which to find the value depending on src
 * @param src the source containing the value
 * @returns the code containing the Content-Type value
 */
function getContentTypeValue(
  method: go.MethodType | go.NextPageMethod,
  src: go.BodyParameterContentTypeKind,
): string {
  switch (src.kind) {
    case "literal":
      return helpers.formatLiteralValue(src, false);
    case "parameterRef": {
      // find the param
      for (const param of method.parameters) {
        if (param.kind === "headerScalarParam" && param.name === src.name) {
          if (go.isClientSideDefault(param.style)) {
            return getClientSideDefaultVarName(param);
          }
          let paramName = helpers.getParamName(param);
          if (param.type.kind === "constant") {
            paramName = `string(${paramName})`;
          }
          return paramName;
        }
      }
      throw new CodegenError("InternalError", `didn't find parameter reference ${src.name}`);
    }
  }
}

/**
 * returns true if the given slice of time.Time requires custom marshalling.
 *
 * the caller narrows to go.Slice<go.Time> (via go.isSlice) before calling this; this only
 * decides marshalling based on the element's TimeFormat/utc. keep it a plain boolean rather
 * than widening the param back to go.WireType and returning a `type is go.Slice<go.Time>`
 * predicate: a false result (e.g. RFC3339 non-utc, which uses the default marshaller) does
 * not mean the value isn't a slice of time.Time, so a predicate would unsoundly narrow those
 * out of any later slice-of-time checks.
 *
 * @param type the slice of time.Time to inspect
 * @returns true if the slice needs custom marshalling
 */
function isSliceOfTimeForMarshalling(type: go.Slice<go.Ptr<go.Time> | go.Time>): boolean {
  const elementType = go.unwrapPtr(type.elementType);
  switch (elementType.format) {
    case "PlainDate":
    case "RFC1123":
    case "RFC7231":
    case "PlainTime":
    case "Unix":
      return true;
    case "RFC3339":
      // RFC3339 normally uses the default time.Time marshaller, but utc slices
      // must be normalized to UTC, which requires building the wrapper slice.
      return elementType.utc;
    default:
      return false;
  }
  return false;
}
