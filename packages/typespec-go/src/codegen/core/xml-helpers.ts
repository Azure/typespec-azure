/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

/**
 * Returns true when the type is a model whose custom XML name must only be used at roots.
 */
export function isXMLNamedModel(
  type: go.WireType,
  pkg: go.PackageContent,
): type is go.Model {
  return (
    type.kind === "model" &&
    type.pkg === pkg &&
    type.xml?.name !== undefined &&
    !type.annotations.omitSerDeMethods &&
    helpers.getSerDeFormat(type, pkg) === "XML"
  );
}

/**
 * Returns true when the model contains a property or array item whose model has a custom XML name.
 */
export function needsXMLNestedModelMarshalling(
  model: go.Model,
  pkg: go.PackageContent,
): boolean {
  return model.fields.some(
    (field) =>
      isXMLNamedModel(field.type, pkg) ||
      (field.type.kind === "slice" && isXMLNamedModel(field.type.elementType, pkg)),
  );
}

/**
 * Creates the content for the required XML marshalling helpers.
 *
 * @param pkg contains the package content
 * @returns the text for the file or the empty string
 */
export function generateXMLHelpers(pkg: go.PackageContent): string {
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

  const nestedModelRequired = pkg.models.some(
    (model) =>
      model.kind === "model" &&
      !model.annotations.omitSerDeMethods &&
      helpers.getSerDeFormat(model, pkg) === "XML" &&
      needsXMLNestedModelMarshalling(model, pkg),
  );
  if (!additionalPropertiesRequired && !nestedModelRequired) {
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
  if (nestedModelRequired) {
    text += `
type xmlModelMarshaler interface {
	marshalXML(*xml.Encoder, xml.StartElement, bool) error
}

type xmlNestedModel struct {
	value xmlModelMarshaler
}

// MarshalXML implements the xml.Marshaler interface for xmlNestedModel.
func (x xmlNestedModel) MarshalXML(enc *xml.Encoder, start xml.StartElement) error {
	return x.value.marshalXML(enc, start, false)
}
`;
  }
  return text;
}
