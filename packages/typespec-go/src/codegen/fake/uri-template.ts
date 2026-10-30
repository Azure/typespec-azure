/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import { CodegenError } from "../core/errors.js";
import * as helpers from "../core/helpers.js";
import { ImportManager } from "../core/imports.js";
import { getPathExpansionStyle } from "../core/path-expansion.js";

/** Emits a typed parser shared by URI-template arrays, maps, and object members. */
function valueParser(type: go.WireType, pkg: go.FakePackage, imports: ImportManager): string {
  const wireType = go.unwrapPtr(type);
  const typeName = go.getTypeDeclaration(type, pkg);
  imports.addForType(type);
  if (type.kind === "ptr") {
    const parse = valueParser(type.ptrType, pkg, imports);
    return `func(v string) (${typeName}, error) {
      parsed, parseErr := (${parse})(v)
      if parseErr != nil { return nil, parseErr }
      return &parsed, nil
    }`;
  }
  let body: string;
  switch (wireType.kind) {
    case "string":
      body = "return v, nil";
      break;
    case "literal":
      return valueParser(
        wireType.type.kind === "constantDef" ? wireType.type.literal : wireType.type,
        pkg,
        imports,
      );
    case "constant":
    case "scalar": {
      const scalar = wireType.type;
      if (scalar === "string") {
        body = `return ${typeName}(v), nil`;
      } else {
        imports.add("strconv");
        const parse =
          scalar === "bool"
            ? "strconv.ParseBool(v)"
            : scalar === "float32" || scalar === "float64"
              ? `strconv.ParseFloat(v, ${scalar === "float32" ? 32 : 64})`
              : `strconv.Parse${scalar.startsWith("uint") || scalar === "byte" ? "Uint" : "Int"}(v, 10, ${scalar === "byte" ? 8 : scalar === "rune" ? 32 : scalar.replace(/^u?int/, "")})`;
        body = `parsed, parseErr := ${parse}\nreturn ${typeName}(parsed), parseErr`;
      }
      break;
    }
    case "encodedBytes":
      imports.add("encoding/base64");
      body = `return base64.${helpers.formatBytesEncoding(wireType.encoding)}Encoding.DecodeString(v)`;
      break;
    case "time": {
      imports.add("time");
      if (wireType.format === "Unix") {
        imports.add("strconv");
        body =
          "parsed, parseErr := strconv.ParseInt(v, 10, 64)\nreturn time.Unix(parsed, 0), parseErr";
      } else {
        const format = {
          PlainDate: helpers.plainDateFormat,
          PlainTime: helpers.plainTimeFormat,
          RFC1123: helpers.RFC1123Format,
          RFC3339: helpers.RFC3339Format,
          RFC7231: helpers.RFC1123Format,
        }[wireType.format];
        body = `return time.Parse(${format}, v)`;
      }
      break;
    }
    default:
      throw new CodegenError(
        "UnsupportedTsp",
        `unsupported URI-template value type ${wireType.kind}`,
      );
  }
  return `func(v string) (${typeName}, error) { ${body} }`;
}

export function parseURITemplateParameter(
  param: go.PathCollectionParameter | go.PathMapParameter | go.QueryParameter,
  raw: string,
  result: string,
  querySource: string,
  method: go.MethodType,
  pkg: go.FakePackage,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  const fail = "if err != nil { return nil, err }\n";
  const parseFail = "if parseErr != nil { return nil, parseErr }\n";
  let text = "";
  if (param.kind === "pathCollectionParam" || param.kind === "pathMapParam") {
    const { prefix, separator } = getPathExpansionStyle(param);
    const values = `${result}Values`;
    text += `${values}, err := splitURIPath(${raw}, ${JSON.stringify(prefix)}, ${JSON.stringify(separator)})\n${fail}`;
    const parser = valueParser(param.type.itemType, pkg, imports);
    const parse =
      param.kind === "pathMapParam"
        ? `parseURIMap(${values}, ${param.explode}, ${param.isEncoded}, ${parser})`
        : `parseURIArray(${values}, ${param.isEncoded}, ${parser})`;
    text += `${result}, err := ${parse}\n${fail}`;
  } else if (param.kind === "queryMapParam") {
    const parser = valueParser(param.type.itemType, pkg, imports);
    if (!param.explode) {
      const parse = `parseURIQueryMap(${raw}, ${parser})`;
      if (go.isRequiredParameter(param.style)) {
        text += `${result}, err := ${parse}\n${fail}`;
      } else {
        text += `var ${result} ${go.getTypeDeclaration(param.type, pkg)}\n`;
        text += `if ${querySource}.Has(${JSON.stringify(param.queryParameter)}) {\n`;
        text += `parsed, parseErr := ${parse}\n${parseFail}${result} = parsed\n}\n`;
      }
    } else {
      const excluded = new Set<string>();
      const query = method.httpPath.split("?")[1];
      if (query) {
        for (const key of new URLSearchParams(query).keys()) {
          excluded.add(key);
        }
      }
      for (const other of method.parameters) {
        if (go.isQueryParameter(other) && other !== param) {
          excluded.add(
            other.queryExpansion?.explode === false
              ? other.queryExpansion.queryParameter
              : other.queryParameter,
          );
        }
      }
      const typeName = go.getTypeDeclaration(param.type, pkg);
      text += `${result} := ${typeName}{}\n`;
      text += `for key, values := range ${querySource} {\n`;
      if (excluded.size > 0) {
        text += `if ${[...excluded].map((key) => `key == ${JSON.stringify(key)}`).join(" || ")} { continue }\n`;
      }
      text += `if len(values) == 0 { continue }\n`;
      text += `parsed, parseErr := (${parser})(values[0])\n${parseFail}`;
      text += `${result}[key] = parsed\n}\n`;
      if (!go.isRequiredParameter(param.style)) {
        text += `if len(${result}) == 0 { ${result} = nil }\n`;
      }
    }
  } else {
    const parse =
      param.kind === "queryCollectionParam"
        ? `parseURIArray(splitURIQuery(${raw}), false, ${valueParser(param.type.itemType, pkg, imports)})`
        : `(${valueParser(go.unwrapPtr(param.type), pkg, imports)})(${raw})`;
    if (go.isRequiredParameter(param.style)) {
      text += `${result}, err := ${parse}\n${fail}`;
    } else {
      text += `var ${result} ${go.getTypeDeclaration(param.type, pkg)}\n`;
      text += `if ${querySource}.Has(${JSON.stringify(param.queryParameter)}) {\n`;
      text += `parsed, parseErr := ${parse}\n${parseFail}`;
      text += `${result} = ${param.type.kind === "ptr" ? "&" : ""}parsed\n}\n`;
    }
  }
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => `${indent.get()}${line}\n`)
    .join("");
}
