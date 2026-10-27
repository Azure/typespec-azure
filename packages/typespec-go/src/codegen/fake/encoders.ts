/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as naming from "../../naming/naming.js";
import { CodegenError } from "../core/errors.js";
import * as helpers from "../core/helpers.js";
import { ImportManager } from "../core/imports.js";

/** the receiver name for the generated encode functions */
const receiverName = "e";

/**
 * Generates the content for the sse_encoders.go file.
 * the file contains one encode function per SSE union type which is
 * used by the fake servers to render a value as an SSE frame.
 *
 * @param pkg contains the package content
 * @returns the text for the file or the empty string when there are no SSE union types
 */
export function generateSseEncoders(pkg: go.FakePackage): string {
  const sseUnions = pkg.parent.unions.filter(
    (goUnion) => (goUnion.usage & go.UnionStructFlags.SseType) !== 0,
  );
  if (sseUnions.length === 0) {
    return "";
  }

  const imports = new ImportManager(pkg);
  imports.addForPkg(pkg.parent);
  imports.add("fmt");
  imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming");

  const indent = new helpers.Indentation();
  let body = "";
  for (const goUnion of sseUnions) {
    body += generateSseEncoder(pkg, goUnion, imports, indent);
  }

  return helpers.contentPreamble(pkg) + imports.text() + body;
}

/**
 * creates the encode function for the specified SSE union type
 *
 * @param pkg contains the package content
 * @param goUnion the type for which to emit the function
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the text for the encode function
 */
function generateSseEncoder(
  pkg: go.FakePackage,
  goUnion: go.UnionStruct,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  const funcName = `encode${goUnion.name}`;
  const typeName = go.getTypeDeclaration(goUnion, pkg);

  const article = goUnion.name.match(/^[aeiou]/i) ? "an" : "a";
  let text = helpers.formatDocComment({
    summary: `${funcName} renders ${article} ${goUnion.name} value to an SSE frame.`,
  });
  text += `func ${funcName}(${receiverName} ${typeName}) (streaming.SSEFrame, error) {\n`;

  const noValue = (indent: helpers.Indentation) =>
    `${indent.get()}return streaming.SSEFrame{}, fmt.Errorf("no field set in %T", ${receiverName})\n`;

  const fields = helpers.getUnionFields(goUnion);
  if (fields.length === 0) {
    text += noValue(indent);
    return text + "}\n\n";
  }
  if (fields.length === 1) {
    // with a single event there's nothing to discriminate on
    const field = fields[0];
    text += `${indent.get()}${helpers.buildIfBlock(indent, {
      condition: `${receiverName}.${field.name} != nil`,
      body: (indent) => generateSseFrame(goUnion, field, imports, indent),
    })}\n`;
    text += noValue(indent);
    text += "}\n\n"; // end func
    return text;
  }

  const cases = fields.map((field) => {
    return {
      expression: `${receiverName}.${field.name} != nil`,
      clause: (indent: helpers.Indentation) => generateSseFrame(goUnion, field, imports, indent),
    };
  });

  text += `${indent.get()}${helpers.buildSwitchCase(indent, "", cases, { clause: noValue })}`;

  text += "}\n\n"; // end func
  return text;
}

/**
 * creates the clause that serializes the specified event to an SSE frame
 *
 * @param goUnion the union type containing the event
 * @param field the variant for the event to serialize
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the text for the clause
 */
function generateSseFrame(
  goUnion: go.UnionStruct,
  field: go.UnionField,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  const sse = field.sse;
  if (!sse) {
    throw new CodegenError(
      "InternalError",
      `missing SSE info for field ${field.name} in union ${goUnion.name}`,
    );
  }

  // for an event envelope, only the payload is sent in the data field
  const payload = sse.envelopeField
    ? {
        name: `${receiverName}.${field.name}.${sse.envelopeField.name}`,
        type: sse.envelopeField.type,
      }
    : { name: `${receiverName}.${field.name}`, type: <go.WireType>field.type };

  let text = "";
  let dataVar: string;
  if (sse.format === "Text") {
    // the payload is sent verbatim
    if (sse.envelopeField && payload.type.kind === "ptr") {
      // the envelope field is optional so it's copied to a local before dereferencing.
      // the variant itself doesn't require this as the caller checked it for nil.
      const local = naming.getEscapedReservedName(
        naming.uncapitalize(sse.envelopeField.name),
        "Val",
      );
      text = `${indent.get()}var ${local} ${go.getTypeDeclaration(go.unwrapPtr(payload.type), goUnion.pkg)}\n`;
      text += `${indent.get()}${helpers.buildIfBlock(indent, {
        condition: `${payload.name} != nil`,
        body: (indent) => `${indent.get()}${local} = *${payload.name}\n`,
      })}\n`;
      dataVar = `[]byte(${local})`;
    } else {
      const deref = payload.type.kind === "ptr" ? "*" : "";
      dataVar = `[]byte(${deref}${payload.name})`;
    }
  } else {
    imports.add("encoding/json");
    text = `${indent.get()}data, err := json.Marshal(${payload.name})\n`;
    text += `${indent.get()}${helpers.buildErrCheck(indent, "err", "streaming.SSEFrame{}")}\n`;
    dataVar = "data";
  }

  // unnamed events have no event field so the frame type is left unset
  const frameType = sse.name ? `Type: "${sse.name}", ` : "";
  text += `${indent.get()}return streaming.SSEFrame{${frameType}Data: ${dataVar}}, nil\n`;
  return text;
}
