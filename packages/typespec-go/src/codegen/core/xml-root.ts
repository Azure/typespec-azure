/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

/**
 * Returns the custom XML root name for a body parameter, if any.
 *
 * @param bodyParam the body parameter to inspect
 * @returns the custom XML root name or undefined
 */
export function getXMLRootName(bodyParam: go.BodyParameter): string | undefined {
  if (bodyParam.bodyFormat !== "XML") {
    return undefined;
  }
  if (bodyParam.type.kind !== "model" && bodyParam.type.kind !== "polymorphicModel") {
    return undefined;
  }
  return bodyParam.xml?.name ?? bodyParam.type.xml?.name;
}

/**
 * Creates the helper that applies a model's custom XML name at the request body root.
 *
 * @param pkg contains the package content
 * @returns the text for the file or the empty string
 */
export function generateXMLRootHelper(pkg: go.PackageContent): string {
  const required = pkg.clients.some((client) =>
    client.methods.some((method) => {
      const bodyParam = helpers.getMethodParamGroups(method).bodyParam;
      return bodyParam !== undefined && getXMLRootName(bodyParam) !== undefined;
    }),
  );
  if (!required) {
    return "";
  }

  const imports = new ImportManager(pkg);
  imports.add("encoding/xml");
  let text = helpers.contentPreamble(pkg);
  text += imports.text();
  text += `type xmlRoot struct {
\tvalue any
\tname  string
}

// MarshalXML implements the xml.Marshaler interface for xmlRoot.
func (x xmlRoot) MarshalXML(enc *xml.Encoder, _ xml.StartElement) error {
\treturn enc.EncodeElement(x.value, xml.StartElement{Name: xml.Name{Local: x.name}})
}
`;
  return text;
}
