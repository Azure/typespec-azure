/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

/**
 * Creates the content for the polymorphic_helpers.go file.
 *
 * @param pkg contains the package content
 * @returns the text for the file or the empty string
 */
export function generatePolymorphicHelpers(pkg: go.FakePackage | go.PackageContent): string {
  const content = pkg.kind === "fake" ? pkg.parent : pkg;
  if (content.interfaces.length === 0) {
    // no polymorphic types
    return "";
  }

  let text = helpers.contentPreamble(pkg);
  const imports = new ImportManager(pkg);
  imports.add("encoding/json");
  if (pkg.kind === "fake") {
    // content is being generated into a separate package, add the necessary import
    imports.addForPkg(pkg.parent);
  }

  const scalars = new Set<string>();
  const collections = new Map<string, go.Slice | go.Map>();

  // we know there are polymorphic types but we don't know how they're used.
  // i.e. are they vanilla fields, elements in a slice, or values in a map.
  // polymorphic types within maps/slices will also need the scalar helpers.
  const trackDiscriminator = function (type: go.WireType) {
    switch (type.kind) {
      case "interface":
        scalars.add(type.name);
        break;
      case "map":
      case "slice":
        if (helpers.recursiveUnwrapMapSlice(type).kind === "interface") {
          collections.set(helpers.getDiscriminatorUnmarshallerName(type), type);
          trackDiscriminator(type.itemType);
        }
        break;
    }
  };

  // calculate which discriminator helpers we actually need to generate

  if (pkg.kind === "fake") {
    // when generating for the fakes server, we must look at operation parameters instead of return values
    for (const client of pkg.parent.clients) {
      for (const method of client.methods) {
        for (const param of method.parameters) {
          trackDiscriminator(param.type);
        }
      }
    }
  } else {
    for (const model of pkg.models) {
      for (const field of model.fields) {
        trackDiscriminator(field.type);
      }
    }

    for (const respEnv of pkg.responseEnvelopes) {
      switch (respEnv.result?.kind) {
        case "monomorphicResult":
          switch (respEnv.result.type.kind) {
            case "map":
            case "slice":
              trackDiscriminator(respEnv.result.type);
              break;
          }
          break;
        case "polymorphicResult":
          trackDiscriminator(respEnv.result.type);
          break;
      }
    }
  }

  if (scalars.size === 0) {
    // this is a corner-case that can happen when all the discriminated types
    // are error types.  there's a bug in M4 that incorrectly annotates such
    // types as 'output', 'exception' in the usage however it's really just
    // 'exception'.  until this is fixed, we can wind up here.
    return "";
  }

  if (content.interfaces.some((iface) => !iface.rootType && scalars.has(iface.name))) {
    imports.add("fmt");
  }
  text += imports.text();

  let prefix = "";
  if (pkg.kind === "fake") {
    // content is being generated into a separate package, set the type name prefix
    prefix = `${go.getPackageName(pkg.parent)}.`;
  }

  const indent = new helpers.Indentation();

  for (const interfaceType of content.interfaces) {
    // generate unmarshallers for each discriminator

    // scalar unmarshaller
    if (scalars.has(interfaceType.name)) {
      text += `func unmarshal${interfaceType.name}(rawMsg json.RawMessage) (${prefix}${interfaceType.name}, error) {\n`;
      text += `${indent.get()}if rawMsg == nil || string(rawMsg) == "null" {\n`;
      text += `${indent.push().get()}return nil, nil\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}var m map[string]any\n`;
      text += `${indent.get()}if err := json.Unmarshal(rawMsg, &m); err != nil {\n`;
      text += `${indent.push().get()}return nil, err\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}if m == nil {\n`;
      text += `${indent.push().get()}return nil, nil\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}var b ${prefix}${interfaceType.name}\n`;
      text += `${indent.get()}switch m["${interfaceType.discriminatorField}"] {\n`;
      for (const possibleType of interfaceType.possibleTypes) {
        let disc = helpers.formatLiteralValue(possibleType.discriminatorValue!, true);
        // when the discriminator value is an enum, cast the const as a string
        if (possibleType.discriminatorValue!.type.kind === "constant") {
          disc = `string(${prefix}${disc})`;
        }
        text += `${indent.get()}case ${disc}:\n`;
        indent.push();
        text += `${indent.get()}b = &${prefix}${possibleType.name}{}\n`;
        indent.pop();
      }
      text += `${indent.get()}default:\n`;
      indent.push();
      if (interfaceType.rootType) {
        text += `${indent.get()}b = &${prefix}${interfaceType.rootType.name}{}\n`;
      } else {
        text += `${indent.get()}return nil, fmt.Errorf("unrecognized discriminator value %v for ${interfaceType.name}", m["${interfaceType.discriminatorField}"])\n`;
      }
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}if err := json.Unmarshal(rawMsg, b); err != nil {\n`;
      text += `${indent.push().get()}return nil, err\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}return b, nil\n`;
      text += "}\n\n";
    }

    for (const [name, type] of [...collections].sort(([a], [b]) => helpers.sortAscending(a, b))) {
      if (helpers.recursiveUnwrapMapSlice(type) !== interfaceType) {
        continue;
      }
      const typeName = go.getTypeDeclaration(type, pkg);
      const isArray = type.kind === "slice";
      const rawType = isArray ? "[]json.RawMessage" : "map[string]json.RawMessage";
      const target = isArray ? "fArray" : "fMap";
      const key = isArray ? "index" : "key";
      text += `func ${name}(rawMsg json.RawMessage) (${typeName}, error) {\n`;
      text += `${indent.get()}if rawMsg == nil || string(rawMsg) == "null" {\n`;
      text += `${indent.push().get()}return nil, nil\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}var rawMessages ${rawType}\n`;
      text += `${indent.get()}if err := json.Unmarshal(rawMsg, &rawMessages); err != nil {\n`;
      text += `${indent.push().get()}return nil, err\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}${target} := make(${typeName}, len(rawMessages))\n`;
      text += `${indent.get()}for ${key}, rawMessage := range rawMessages {\n`;
      indent.push();
      text += `${indent.get()}f, err := ${helpers.getDiscriminatorUnmarshallerName(type.itemType)}(rawMessage)\n`;
      text += `${indent.get()}if err != nil {\n`;
      text += `${indent.push().get()}return nil, err\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}${target}[${key}] = f\n`;
      text += `${indent.pop().get()}}\n`;
      text += `${indent.get()}return ${target}, nil\n`;
      text += "}\n\n";
    }
  }
  return text;
}
