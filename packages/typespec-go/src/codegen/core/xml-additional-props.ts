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
 * Creates the content for the required XML marshalling helpers.
 *
 * @param pkg contains the package content
 * @returns the text for the file or the empty string
 */
export function generateXMLAdditionalPropsHelpers(pkg: go.PackageContent): string {
  let additionalPropertiesRequired = false;
  for (const model of pkg.models) {
    if (helpers.getSerDeFormat(model, pkg) !== "XML") {
      continue;
    }
    for (const field of model.fields) {
      if (field.type.kind === "map") {
        additionalPropertiesRequired = true;
        break;
      }
    }
    if (additionalPropertiesRequired) {
      break;
    }
  }

  const xmlRootRequired = pkg.clients.some((client) =>
    client.methods.some((method) => {
      const bodyParam = helpers.getMethodParamGroups(method).bodyParam;
      return bodyParam !== undefined && getXMLRootName(bodyParam) !== undefined;
    }),
  );
  if (!additionalPropertiesRequired && !xmlRootRequired) {
    return "";
  }

  let text = helpers.contentPreamble(pkg);
  const imports = new ImportManager(pkg);
  imports.add("encoding/xml");
  if (additionalPropertiesRequired) {
    imports.add("errors");
    imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/to");
    imports.add("io");
    imports.add("strings");
  }
  text += imports.text();
  if (additionalPropertiesRequired) {
    text += `
type additionalProperties map[string]*string

// MarshalXML implements the xml.Marshaler interface for additionalProperties.
func (ap additionalProperties) MarshalXML(e *xml.Encoder, start xml.StartElement) error {
	if err := e.EncodeToken(start); err != nil {
		return err
	}
	for k, v := range ap {
		err := e.EncodeToken(xml.StartElement{
			Name: xml.Name{
				Local: k,
			},
		})
		if err != nil {
			return err
		}
		if v != nil {
			err = e.EncodeToken(xml.CharData(*v))
			if err != nil {
				return err
			}
		}
		err = e.EncodeToken(xml.EndElement{
			Name: xml.Name{
				Local: k,
			},
		})
		if err != nil {
			return err
		}
	}
	return e.EncodeToken(xml.EndElement{
		Name: start.Name,
	})
}

// UnmarshalXML implements the xml.Unmarshaler interface for additionalProperties.
func (ap *additionalProperties) UnmarshalXML(d *xml.Decoder, start xml.StartElement) error {
	tokName := ""
	tokValue := ""
	for {
		t, err := d.Token()
		if errors.Is(err, io.EOF) {
			break
		} else if err != nil {
			return err
		}
		switch tt := t.(type) {
		case xml.StartElement:
			tokName = strings.ToLower(tt.Name.Local)
			tokValue = ""
		case xml.CharData:
			if tokName == "" {
				continue
			}
			tokValue = string(tt)
		case xml.EndElement:
			if tokName == "" {
				continue
			}
			if *ap == nil {
				*ap = additionalProperties{}
			}
			(*ap)[tokName] = to.Ptr(tokValue)
			tokName = ""
		}
	}
	return nil
}
`;
  }
  if (xmlRootRequired) {
    text += `
type xmlRoot struct {
	value any
	name  string
}

// MarshalXML implements the xml.Marshaler interface for xmlRoot.
func (x xmlRoot) MarshalXML(enc *xml.Encoder, _ xml.StartElement) error {
	return enc.EncodeElement(x.value, xml.StartElement{Name: xml.Name{Local: x.name}})
}
`;
  }
  return text;
}
