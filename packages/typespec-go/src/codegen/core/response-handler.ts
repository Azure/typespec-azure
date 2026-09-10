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
 * emits the response handler for the specified method.
 * @param method the method for which to create the response handler.
 * @param imports the import manager to track required imports.
 * @param indent the indentation helper for formatting the generated code.
 * @returns the generated response handler code as a string.
 */
export function createResponseHandler(
  method: go.SyncMethod | go.LROPageableMethod | go.PageableMethod,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  const name = method.naming.responseMethod;
  let text = `${helpers.comment(name, "// ")} handles the ${method.name} response.\n`;
  text += `func ${helpers.getClientReceiverDefinition(method.receiver)} ${name}(resp *http.Response, successCodes ...int) (${method.returns.name}, error) {\n`;

  const resultVarName = "result";
  text += `${indent.get()}${resultVarName} := ${method.returns.name}{}\n`;
  text += `${indent.get()}${helpers.buildIfBlock(indent, {
    condition: "!runtime.HasStatusCode(resp, successCodes...)",
    body: (indent) => `${indent.get()}return ${resultVarName}, runtime.NewResponseError(resp)\n`,
  })}\n`;

  for (const header of method.returns.headers) {
    text += formatHeaderResponseValue(
      method,
      header,
      resultVarName,
      `${method.returns.name}{}`,
      imports,
      indent,
    );
  }

  const result = method.returns.result;
  if (result) {
    switch (result.kind) {
      case "anyResult":
        imports.add("fmt");
        text += `${indent.get()}switch resp.StatusCode {\n`;
        for (const statusCode of method.httpStatusCodes) {
          text += `${indent.get()}case ${helpers.formatStatusCodes([statusCode])}:\n`;
          const resultType = result.httpStatusCodeType[statusCode];
          if (!resultType) {
            // the operation contains a mix of schemas and non-schema responses
            continue;
          }
          text += `${indent.get()}var val ${go.getTypeDeclaration(resultType, method.receiver.type.pkg)}\n`;
          text += generateResponseUnmarshaller(
            method,
            resultType,
            result.format,
            "val",
            imports,
            indent,
          );
          text += `${indent.get()}${resultVarName}.${result.fieldName} = val\n`;
        }
        text += `${indent.get()}default:\n`;
        text += `${indent.push().get()}return ${resultVarName}, fmt.Errorf("unhandled HTTP status code %d", resp.StatusCode)\n`;
        text += `${indent.pop().get()}}\n`;
        break;
      case "binaryResult":
        text += `${indent.get()}${resultVarName}.${result.fieldName} = resp.Body\n`;
        break;
      case "headAsBooleanResult":
        text += `${indent.get()}${resultVarName}.${result.fieldName} = resp.StatusCode >= 200 && resp.StatusCode < 300\n`;
        break;
      case "modelResult":
        text += generateResponseUnmarshaller(
          method,
          result.modelType,
          result.format,
          `${resultVarName}.${helpers.getResultFieldName(method)}`,
          imports,
          indent,
        );
        break;
      case "monomorphicResult":
        let target = `${resultVarName}.${helpers.getResultFieldName(method)}`;
        // when unmarshalling a wrapped XML array, unmarshal into the response envelope
        if (result.format === "XML" && result.monomorphicType.kind === "slice") {
          target = resultVarName;
        }
        text += generateResponseUnmarshaller(
          method,
          result.monomorphicType,
          result.format,
          target,
          imports,
          indent,
        );
        break;
      case "polymorphicResult":
        text += generateResponseUnmarshaller(
          method,
          result.interface,
          result.format,
          resultVarName,
          imports,
          indent,
        );
        break;
      default:
        result satisfies never;
    }
  }

  text += `${indent.get()}return ${resultVarName}, nil\n`;
  text += "}\n\n";
  return text;
}

function generateResponseUnmarshaller(
  method: go.MethodType,
  type: go.WireType,
  format: go.ResultFormat,
  unmarshalTarget: string,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  let unmarshallerText = "";
  const zeroValue = `${method.returns.name}{}`;
  if (type.kind === "time") {
    // use the designated time type for unmarshalling
    imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime/datetime");
    unmarshallerText += `${indent.get()}var aux *datetime.${type.format}\n`;
    unmarshallerText += `${indent.get()}if err := runtime.UnmarshalAs${format}(resp, &aux); err != nil {\n`;
    unmarshallerText += `${indent.push().get()}return ${zeroValue}, err\n`;
    unmarshallerText += `${indent.pop().get()}}\n`;
    unmarshallerText += `${indent.get()}${unmarshalTarget} = (*time.Time)(aux)\n`;
    return unmarshallerText;
  } else if (go.isSlice(type, "time")) {
    // unmarshalling arrays of date/time is a little more involved
    const timeType = go.unwrapPtr(type.elementType);
    const elementPtr = type.elementType.kind === "ptr" ? "*" : "";
    imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime/datetime");
    unmarshallerText += `${indent.get()}var aux []${elementPtr}datetime.${timeType.format}\n`;
    unmarshallerText += `${indent.get()}if err := runtime.UnmarshalAs${format}(resp, &aux); err != nil {\n`;
    unmarshallerText += `${indent.push().get()}return ${zeroValue}, err\n`;
    unmarshallerText += `${indent.pop().get()}}\n`;
    unmarshallerText += `${indent.get()}cp := make([]${elementPtr}time.Time, len(aux))\n`;
    unmarshallerText += `${indent.get()}for i := 0; i < len(aux); i++ {\n`;
    unmarshallerText += `${indent.push().get()}cp[i] = (${elementPtr}time.Time)(aux[i])\n`;
    unmarshallerText += `${indent.pop().get()}}\n`;
    unmarshallerText += `${indent.get()}${unmarshalTarget} = cp\n`;
    return unmarshallerText;
  } else if (go.isMap(type, "time")) {
    const timeType = type.valueType.ptrType;
    imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime/datetime");
    unmarshallerText += `${indent.get()}aux := map[string]*datetime.${timeType.format}{}\n`;
    unmarshallerText += `${indent.get()}if err := runtime.UnmarshalAs${format}(resp, &aux); err != nil {\n`;
    unmarshallerText += `${indent.push().get()}return ${zeroValue}, err\n`;
    unmarshallerText += `${indent.pop().get()}}\n`;
    unmarshallerText += `${indent.get()}cp := map[string]*time.Time{}\n`;
    unmarshallerText += `${indent.get()}for k, v := range aux {\n`;
    unmarshallerText += `${indent.push().get()}cp[k] = (*time.Time)(v)\n`;
    unmarshallerText += `${indent.pop().get()}}\n`;
    unmarshallerText += `${indent.get()}${unmarshalTarget} = cp\n`;
    return unmarshallerText;
  }
  if (format === "JSON" || format === "XML") {
    if (type.kind === "rawJSON") {
      unmarshallerText += `${indent.get()}body, err := runtime.Payload(resp)\n`;
      unmarshallerText += `${indent.get()}if err != nil {\n`;
      unmarshallerText += `${indent.push().get()}return ${zeroValue}, err\n`;
      unmarshallerText += `${indent.pop().get()}}\n`;
      unmarshallerText += `${indent.get()}${unmarshalTarget} = body\n`;
    } else {
      unmarshallerText += `${indent.get()}if err := runtime.UnmarshalAs${helpers.getMediaFormat(type, format, `resp, &${unmarshalTarget}`)}; err != nil {\n`;
      unmarshallerText += `${indent.push().get()}return ${zeroValue}, err\n`;
      unmarshallerText += `${indent.pop().get()}}\n`;
    }
  } else if (format === "Text") {
    unmarshallerText += `${indent.get()}body, err := runtime.Payload(resp)\n`;
    unmarshallerText += `${indent.get()}if err != nil {\n`;
    unmarshallerText += `${indent.push().get()}return ${zeroValue}, err\n`;
    unmarshallerText += `${indent.pop().get()}}\n`;
    let resultVar: string;
    type = go.unwrapPtr(type);
    switch (type.kind) {
      case "scalar":
        resultVar = "parsedBody";
        unmarshallerText += helpers.emitScalarParsing(
          type,
          "string(body)",
          resultVar,
          imports,
          indent,
        );
        unmarshallerText += `${indent.get()}${helpers.buildErrCheck(indent, "err", zeroValue)}\n`;
        break;
      case "string":
        resultVar = "txt";
        unmarshallerText += `${indent.get()}${resultVar} := string(body)\n`;
        break;
      default:
        throw new CodegenError(
          "UnsupportedTsp",
          `unsupported text return kind ${type.kind} for method ${method.receiver.type.name}.${method.name}`,
        );
    }
    unmarshallerText += `${indent.get()}${unmarshalTarget} = &${resultVar}\n`;
  } else {
    // the remaining formats should have been handled elsewhere
    throw new CodegenError(
      "InternalError",
      `unhandled format ${format} for operation ${method.receiver.type.name}.${method.name}`,
    );
  }
  return unmarshallerText;
}

// use this to generate the code that will help process values returned in response headers
function formatHeaderResponseValue(
  method: go.SyncMethod | go.LROPageableMethod | go.PageableMethod,
  headerResp: go.HeaderScalarResponse | go.HeaderMapResponse,
  respObj: string,
  zeroResp: string,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  // dictionaries are handled slightly different so we do that first
  if (headerResp.kind === "headerMapResponse") {
    imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/to");
    imports.add("strings");
    const headerPrefix = headerResp.headerName;
    let text = `${indent.get()}for hh := range resp.Header {\n`;
    text += `${indent.push().get()}if len(hh) > len("${headerPrefix}") && strings.EqualFold(hh[:len("${headerPrefix}")], "${headerPrefix}") {\n`;
    text += `${indent.push().get()}if ${respObj}.${headerResp.fieldName} == nil {\n`;
    text += `${indent.push().get()}${respObj}.${headerResp.fieldName} = map[string]*string{}\n`;
    text += `${indent.pop().get()}}\n`;
    text += `${indent.get()}${respObj}.${headerResp.fieldName}[hh[len("${headerPrefix}"):]] = to.Ptr(resp.Header.Get(hh))\n`;
    text += `${indent.pop().get()}}\n`;
    text += `${indent.pop().get()}}\n`;
    return text;
  }

  let text = `${indent.get()}if val := resp.Header.Get("${helpers.canonicalizeHeaderName(headerResp.headerName)}"); val != "" {\n`;
  indent.push();
  let name = naming.uncapitalize(headerResp.fieldName);
  let byRef = "&";
  const headerRespType = go.unwrapPtr(headerResp.type);
  switch (headerRespType.kind) {
    case "constant":
    case "etag":
      text += `${indent.get()}${respObj}.${headerResp.fieldName} = (${go.getTypeDeclaration(headerResp.type, method.receiver.type.pkg)})(&val)\n`;
      indent.pop();
      text += `${indent.get()}}\n`;
      return text;
    case "encodedBytes":
      // a base-64 encoded value in string format
      imports.add("encoding/base64");
      text += `${indent.get()}${name}, err := base64.${helpers.formatBytesEncoding(headerRespType.encoding)}Encoding.DecodeString(val)\n`;
      byRef = "";
      break;
    case "literal":
      text += `${indent.get()}${respObj}.${headerResp.fieldName} = &val\n`;
      indent.pop();
      text += `${indent.get()}}\n`;
      return text;
    case "scalar":
      text += helpers.emitScalarParsing(headerRespType, "val", name, imports, indent);
      break;
    case "string":
      text += `${indent.get()}${respObj}.${headerResp.fieldName} = &val\n`;
      text += `${indent.pop().get()}}\n`;
      return text;
    case "time":
      if (headerRespType.format === "Unix") {
        imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/to");
        text += helpers.emitTimeParsing("val", headerRespType, "sec", imports, indent);
        name = "to.Ptr(time.Unix(sec, 0))";
        byRef = "";
      } else {
        text += helpers.emitTimeParsing("val", headerRespType, name, imports, indent);
      }
  }

  // NOTE: only cases that required parsing will fall through to here
  text += `${indent.get()}if err != nil {\n`;
  text += `${indent.push().get()}return ${zeroResp}, err\n`;
  text += `${indent.pop().get()}}\n`;
  text += `${indent.get()}${respObj}.${headerResp.fieldName} = ${byRef}${name}\n`;
  text += `${indent.pop().get()}}\n`;
  return text;
}
