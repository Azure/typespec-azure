/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import { CodegenError } from "./errors.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

/** the union types content to emit */
export interface Unions {
  /** content for unions.go */
  types: string;

  /** content for unions_serde.go */
  serde: string;
}

/**
 * creates the content for unions.go and unions_serde.go files.
 * if the package contains no union types, undefined is returned.
 *
 * @param pkg contains the package content
 * @returns the text for the files or undefined
 */
export function generateUnions(pkg: go.PackageContent): Unions | undefined {
  if (pkg.unions.length === 0) {
    return undefined;
  }

  const indent = new helpers.Indentation();
  const imports = new ImportManager(pkg);

  const typeDefs = generateUnionTypes(pkg.unions, imports, indent);
  let text = helpers.contentPreamble(pkg);
  text += imports.text();
  text += typeDefs;

  return {
    types: text,
    serde: generateUnionsSerde(pkg),
  };
}

/**
 * creates the union type definitions
 *
 * @param goUnions the union types to emit
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the text for the union type definitions
 */
function generateUnionTypes(
  goUnions: Array<go.UnionStruct>,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  let text = "";
  for (const goUnion of goUnions) {
    text += helpers.formatDocCommentWithPrefix(goUnion.name, goUnion.docs);
    text += `type ${goUnion.name} struct {\n`;
    indent.push();
    for (const field of goUnion.fields) {
      imports.addForType(field.type);
      text += helpers.formatDocCommentWithPrefix(field.name, field.docs);
      text += `${indent.get()}${field.name} ${go.getTypeDeclaration(field.type, goUnion.pkg)}\n`;
    }
    text += `${indent.pop().get()}}\n\n`;
  }

  return text;
}

/**
 * creates the un/marshalling implementations
 *
 * @param pkg contains the package content
 * @returns the un/marshalling methods
 */
function generateUnionsSerde(pkg: go.PackageContent): string {
  const indent = new helpers.Indentation();
  const imports = new ImportManager(pkg);

  imports.add("encoding/json");
  imports.add("errors");
  imports.add("fmt");

  let emitProbe = false;
  let emitFloat = false;
  let emitRequired = false;

  let content = "";
  for (const goUnion of pkg.unions) {
    content += generateMarshalJson(goUnion, indent);
    const result = generateUnmarshalJson(goUnion, indent);
    content += result.content;

    // don't overwrite an existing true with false
    emitProbe = emitProbe ? true : result.emitProbe;
    emitFloat = emitFloat ? true : result.emitFloat;
    emitRequired = emitRequired ? true : result.emitRequired;
  }

  let text = helpers.contentPreamble(pkg);
  text += imports.text();
  text += content;
  if (emitProbe) {
    text += jsonKindProbe;
  }
  if (emitFloat) {
    text += jsonNumberIsFloat;
  }
  if (emitRequired) {
    text += hasRequiredFields;
  }

  return text;
}

/**
 * creates the MarshalJSON method for the specified union type
 *
 * @param goUnion the type for which to emit the method
 * @param indent the indentation helper currently in scope
 * @returns the text for the MarshalJSON method
 */
function generateMarshalJson(goUnion: go.UnionStruct, indent: helpers.Indentation): string {
  const receiver = getReceiverName(goUnion);
  let text = `func (${receiver} ${goUnion.name}) MarshalJSON() ([]byte, error) {\n`;
  text += `${indent.get()}var val any\n`;
  text += `${indent.get()}set := 0\n`;

  // check each field for nil, if it's not nil, assign it to val and increment set count
  for (const field of goUnion.fields) {
    text += `${indent.get()}${helpers.buildIfBlock(indent, {
      condition: `${receiver}.${field.name} != nil`,
      body: (indent) => {
        let controlBlock = `${indent.get()}val = ${receiver}.${field.name}\n`;
        controlBlock += `${indent.get()}set++\n`;
        return controlBlock;
      },
    })}\n`;
  }

  // switch on the number of fields set.
  // 0 - return an error stating no fields were set
  // 1 - marshal the value
  // more than 1 - return an error stating only one field can be set
  text += `${indent.get()}${helpers.buildSwitchCase(
    indent,
    "set",
    [
      {
        expression: "0",
        clause: (indent) =>
          `${indent.get()}return nil, fmt.Errorf("%T has no value", ${receiver})\n`,
      },
      {
        expression: "1",
        clause: (indent) => `${indent.get()}return json.Marshal(val)\n`,
      },
    ],
    {
      clause: (indent) =>
        `${indent.get()}return nil, fmt.Errorf("set only one field in %T", ${receiver})\n`,
    },
  )}`;

  text += "}\n\n";
  return text;
}

/** the unmarshal content to emit */
interface unmarshalInfo {
  content: string;
  emitFloat: boolean;
  emitProbe: boolean;
  emitRequired: boolean;
}

/**
 * creates the UnmarshalJSON method for the specified union type.
 *
 * mixed types e.g. string, number, array, object - requires jsonKind probe, might require jsonNumberIsFloat
 * mixed objects e.g. Cat, Dog, Snake, Record<T>  - requires hasRequiredFields, no jsonKind prob
 *
 * note that homogenous scalar types get folded into an enum by tcgc
 * so we don't have to handle that case.  e.g. "1 | 2 | 3.14" will be
 * an enum type handled by the standard un/marshalling logic.
 *
 * if goUnion contains mixed types then emit probe + switch/case for jsonKind
 *   if there are mixed JSON numbers, collapse into single "case jsonNumber:"
 * if goUnion contains mixed object types then "else" clause unmarshals into the Record<T>
 *   if this is in mixed types case, collapse into single "case jsonObject:"
 *
 * @param goUnion the type for which to emit the method
 * @param indent the indentation helper currently in scope
 * @returns the text for the UnmarshalJSON method and true/false if the JSON probe helper code should be emitted
 */
function generateUnmarshalJson(
  goUnion: go.UnionStruct,
  indent: helpers.Indentation,
): unmarshalInfo {
  const receiver = getReceiverName(goUnion);
  let text = `func (${receiver} *${goUnion.name}) UnmarshalJSON(data []byte) (err error) {\n`;
  text += `${indent.get()}defer func() {\n`;
  text += `${indent.push().get()}${helpers.buildIfBlock(indent, {
    condition: "err != nil",
    body: (indent) =>
      `${indent.get()}err = fmt.Errorf("unmarshalling type %T: %s", ${receiver}, err.Error())\n`,
  })}\n`;
  text += `${indent.pop().get()}}()\n`;
  const mixedTypes = getForMixedTypes(goUnion);
  if (mixedTypes) {
    text += `${indent.get()}${helpers.buildSwitchCase(
      indent,
      "probeJSONKind(data)",
      mixedTypes.cases,
      {
        clause: (indent) => `${indent.get()}err = errors.New("unexpected JSON token")\n`,
      },
    )}`;
  } else {
    text += generateUnmarshalObjects(goUnion, indent);
  }

  text += `${indent.get()}return\n`;
  text += "}\n\n";

  return {
    content: text,
    emitFloat: mixedTypes ? mixedTypes.emitFloat : false,
    emitProbe: mixedTypes ? true : false,
    emitRequired: mixedTypes ? mixedTypes.emitRequired : true,
  };
}

/**
 * generates the unmarshalling code for JSON objects.
 * this includes typed and untyped objects i.e. Record<T>.
 *
 * @param goUnion the type for which to emit the code
 * @param indent the indentation helper currently in scope
 * @returns the text for unmarshalling JSON objects
 */
function generateUnmarshalObjects(goUnion: go.UnionStruct, indent: helpers.Indentation): string {
  // this is a union of object types e.g. Cat | Dog | Record<T>
  const receiver = getReceiverName(goUnion);
  let text = `${indent.get()}var rawMsg map[string]json.RawMessage\n`;
  text += `${indent.get()}${helpers.buildIfBlock(indent, {
    condition: "err = json.Unmarshal(data, &rawMsg); err != nil",
    body: (indent) => `${indent.get()}return\n`,
  })}\n`;

  const jsonObjects = groupJsonObjects(goUnion);

  // the codegen below assumes at most one map variant, which it treats
  // as the fallback. a union with multiple maps (e.g. Foo | Record<int32>
  // | Record<string>) would generate incorrect code, so fail instead.
  if (jsonObjects.filter((field) => field.type.kind === "map").length > 1) {
    throw new CodegenError(
      "UnsupportedTsp",
      `union ${goUnion.name} has multiple map variants which is not supported`,
    );
  }

  let ifBlock: helpers.ifBlock = { condition: "", body: () => "" };
  const elseIfBlocks = new Array<helpers.ifBlock>();
  for (let i = 0; i < jsonObjects.length; ++i) {
    const field = jsonObjects[i];
    if (field.type.kind === "map") {
      break;
    } else if (!go.isPtr(field.type, "model")) {
      // we already validated this earlier. however it lets
      // the compiler treat field.type as a model type.
      throw new CodegenError("InternalError", `unexpected union type ${field.type.kind}`);
    }

    const condition = `hasRequiredFields(rawMsg, ${getJsonFieldsForProbe(field.type.ptrType)})`;
    const body = (indent: helpers.Indentation) =>
      `${indent.get()}err = json.Unmarshal(data, &${receiver}.${field.name})\n`;
    if (i === 0) {
      ifBlock = {
        condition: condition,
        body: body,
      };
    } else {
      elseIfBlocks.push({
        condition: condition,
        body: body,
      });
    }
  }

  const elseBlock: helpers.elseBlock = { body: () => "" };
  // if the last field is a map then it's the fallback
  if (jsonObjects[jsonObjects.length - 1].type.kind === "map") {
    elseBlock.body = (indent) =>
      `${indent.get()}err = json.Unmarshal(data, &${receiver}.${jsonObjects[jsonObjects.length - 1].name})\n`;
  } else {
    elseBlock.body = (indent) => `${indent.get()}err = errors.New("could not determine variant")\n`;
  }

  text += `${indent.get()}${helpers.buildIfBlock(indent, ifBlock, elseIfBlocks, elseBlock)}\n`;

  return text;
}

/**
 * returns the JSON field names used to probe if the JSON contains the target object.
 * the result is a comma delimited list of strings (`"foo", "bar", "baz"`)
 *
 * @param model the model from which to select the probing fields
 * @returns the list of field names
 */
function getJsonFieldsForProbe(model: go.Model): string {
  const fields = new Array<go.ModelField>();
  for (let i = 0; i < 4 && i < model.fields.length; ++i) {
    fields.push(model.fields[i]);
  }
  return fields.map((f) => `"${f.serializedName}"`).join();
}

/** info for emitting mixed types */
interface mixedTypesInfo {
  cases: Array<helpers.caseStatement>;
  emitFloat: boolean;
  emitRequired: boolean;
}

/**
 * determines if the union is a combination of mixed types.
 * if the union doesn't contain mixed types, undefined is returned.
 * e.g. number | object | string
 *
 * @param goUnion the type to inspect
 * @returns the mixedTypesInfo for the union or undefined
 */
function getForMixedTypes(goUnion: go.UnionStruct): mixedTypesInfo | undefined {
  const groupedObjects = groupJsonObjects(goUnion);
  if (groupedObjects.length === goUnion.fields.length) {
    // all object types so not mixed
    return undefined;
  }

  let hasMixedTypes = false;

  for (let i = 1; i < goUnion.fields.length; ++i) {
    hasMixedTypes = goUnion.fields[i].type !== goUnion.fields[0].type;
    if (hasMixedTypes) {
      break;
    }
  }

  if (!hasMixedTypes) {
    return undefined;
  }

  const mixedNumbers = groupMixedJsonNumbers(goUnion);

  const mixedTypes = new Array<helpers.caseStatement>();
  const receiver = getReceiverName(goUnion);
  for (const field of goUnion.fields) {
    if (
      (mixedNumbers.length > 1 && mixedNumbers.includes(field)) ||
      (groupedObjects.length > 1 && groupedObjects.includes(field))
    ) {
      // will process after since they will collapse into a single case statement
      continue;
    }

    mixedTypes.push({
      expression: getJsonProbeKindForType(field.type),
      clause: (indent) => `${indent.get()}err = json.Unmarshal(data, &${receiver}.${field.name})\n`,
    });
  }

  if (mixedNumbers.length > 1) {
    // first entry is always the float
    mixedTypes.push({
      expression: "jsonNumber",
      clause: (indent) => {
        const caseStatement = `${indent.get()}${helpers.buildIfBlock(
          indent,
          {
            condition: "jsonNumberIsFloat(data)",
            body: (indent) =>
              `${indent.get()}err = json.Unmarshal(data, &${receiver}.${mixedNumbers[0].name})\n`,
          },
          undefined,
          {
            body: (indent) =>
              `${indent.get()}err = json.Unmarshal(data, &${receiver}.${mixedNumbers[1].name})\n`,
          },
        )}\n`;
        return caseStatement;
      },
    });
  }

  if (groupedObjects.length > 1) {
    mixedTypes.push({
      expression: "jsonObject",
      clause: (indent) => generateUnmarshalObjects(goUnion, indent),
    });
  }

  if (mixedNumbers.length > 1 || groupedObjects.length > 1) {
    mixedTypes.sort((a, b) => helpers.sortAscending(a.expression, b.expression));
  }

  mixedTypes.push({
    expression: "jsonEmpty",
    clause: (indent) => `${indent.get()}err = errors.New("unexpected end of JSON input")\n`,
  });

  mixedTypes.push({
    expression: "jsonNull",
    clause: (indent) => `${indent.get()}err = nil\n`,
  });

  return {
    cases: mixedTypes,
    emitFloat: mixedNumbers.length > 1,
    emitRequired: groupedObjects.length > 1,
  };
}

/**
 * returns an array containing mixed JSON number types (ints/floats).
 * if there is no mix of number types, an empty array is returned.
 *
 * @param goUnion the type for which to collect JSON number types
 * @returns an array of heterogenous number types or an empty array
 */
function groupMixedJsonNumbers(goUnion: go.UnionStruct): Array<go.UnionField> {
  const floatFields = new Array<go.UnionField>();
  const nonFloatFields = new Array<go.UnionField>();
  for (const field of goUnion.fields) {
    const scalarType = isJsonNumberType(field.type);
    if (!scalarType) {
      continue;
    }
    if (scalarType.startsWith("float")) {
      floatFields.push(field);
    } else {
      nonFloatFields.push(field);
    }
  }
  if (floatFields.length === 0 || nonFloatFields.length === 0) {
    // homogenous numbers, return empty array
    return [];
  }
  return floatFields.concat(nonFloatFields);
}

/**
 * returns all of the JSON object variant types within a union.
 * the array is sorted by typed objects field length in descending
 * order. any untyped object is the last entry.
 *
 * @param goUnion the type for which to collect JSON objects
 * @returns an array of JSON object types
 */
function groupJsonObjects(goUnion: go.UnionStruct): Array<go.UnionField> {
  const objectFields = new Array<go.UnionField>();
  for (const field of goUnion.fields) {
    if (field.type.kind === "map" || go.isPtr(field.type, "model")) {
      objectFields.push(field);
    }
  }

  // sort the models by field count, so models with a higher
  // field count appear first. we do this in an effort to reduce
  // incorrect unmarshalling target selection. i.e. models with
  // more fields have a better chance of hasRequiredFields() not
  // returning a false positive. maps always appears after models
  objectFields.sort((a, b) => {
    if (go.isPtr(a.type, "model") && go.isPtr(b.type, "model")) {
      return b.type.ptrType.fields.length - a.type.ptrType.fields.length;
    } else if (a.type.kind === "map" && b.type.kind === "map") {
      return 0;
    } else if (a.type.kind === "map") {
      return 1;
    } else if (go.isPtr(a.type, "model")) {
      return -1;
    }
    throw new CodegenError("InternalError", `unexpected union types ${a.type.kind} ${b.type.kind}`);
  });

  return objectFields;
}

/**
 * returns the underlying ScalarType for variantType. if the type
 * is not a scalar undefined is returned. note that bool, byte, and
 * rune scalar types are excluded thus return undefined.
 *
 * @param variantType the type to inspect
 * @returns the ScalarType or undefined
 */
function isJsonNumberType(variantType: go.UnionVariantType): go.ScalarType | undefined {
  if (variantType.kind !== "ptr") {
    return undefined;
  }

  const isScalarJsonNubmer = function (scalar: go.ScalarType): go.ScalarType | undefined {
    switch (scalar) {
      case "bool":
      case "byte":
      case "rune":
        return undefined;
      default:
        return scalar;
    }
  };

  const unwrapped = go.unwrapPtr(variantType);
  switch (unwrapped.kind) {
    case "literal":
      switch (unwrapped.type.kind) {
        case "scalar":
          return isScalarJsonNubmer(unwrapped.type.type);
        default:
          return undefined;
      }
    case "scalar":
      return isScalarJsonNubmer(unwrapped.type);
    default:
      return undefined;
  }
}

/**
 * returns the jsonKind value based on the provided type
 *
 * @param variantType the type to inspect
 * @returns the constant value
 */
function getJsonProbeKindForType(variantType: go.UnionVariantType): string {
  const getScalarProbe = function (scalar: go.ScalarType): string {
    switch (scalar) {
      case "bool":
        return "jsonBool";
      default:
        return "jsonNumber";
    }
  };

  const unwrapped = go.unwrapPtr(variantType);
  switch (unwrapped.kind) {
    case "constant":
      switch (unwrapped.type) {
        case "bool":
          return "jsonBool";
        case "string":
          return "jsonString";
        default:
          return "jsonNumber";
      }
    case "literal":
      switch (unwrapped.type.kind) {
        case "scalar":
          return getScalarProbe(unwrapped.type.type);
        default:
          return "jsonString";
      }
    case "map":
    case "model":
      return "jsonObject";
    case "scalar":
      return getScalarProbe(unwrapped.type);
    case "slice":
      return "jsonArray";
    case "string":
      return "jsonString";
  }
}

/**
 * gets the receiver name based on type name
 *
 * @param goUnion the union type
 * @returns the receiver name
 */
function getReceiverName(goUnion: go.UnionStruct): string {
  return goUnion.name[0].toLowerCase();
}

/** code for sniffing JSON */
const jsonKindProbe = `
type jsonKind int

const (
	jsonUnknown jsonKind = iota
	jsonObject
	jsonArray
	jsonString
	jsonNumber
	jsonBool
	jsonNull
	jsonEmpty
)

func probeJSONKind(data []byte) jsonKind {
	if len(data) == 0 {
		return jsonEmpty
	}
	for _, b := range data {
		switch b {
		case ' ', '\\t', '\\r', '\\n':
			continue
		case '{':
			return jsonObject
		case '[':
			return jsonArray
		case '"':
			return jsonString
		case 't', 'f':
			return jsonBool
		case 'n':
			return jsonNull
		default:
			return jsonNumber
		}
	}
	return jsonUnknown
}
`;

/** code to disambiguate floats and ints */
const jsonNumberIsFloat = `
func jsonNumberIsFloat(data []byte) bool {
	for _, b := range data {
		switch b {
		case '.', 'e', 'E':
			return true
		}
	}
	return false
}
`;

/** code to check raw JSON for a slice of fields */
const hasRequiredFields = `
func hasRequiredFields(rawMsg map[string]json.RawMessage, fields ...string) bool {
	for _, field := range fields {
		if _, ok := rawMsg[field]; !ok {
			return false
		}
	}
	return len(fields) > 0
}
`;
