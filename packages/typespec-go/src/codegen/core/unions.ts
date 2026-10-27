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
    for (const field of helpers.getUnionFields(goUnion)) {
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
  imports.add("fmt");

  const sse = generateSerdeSseType(pkg.unions, imports, indent);
  const sum = generateSerdeSumType(pkg.unions, imports, indent);
  let content = sse.content + sum.content;
  if (sse.emitProbe || sum.emitProbe) {
    content += jsonKindProbe;
  }
  if (sse.emitFloat || sum.emitFloat) {
    content += jsonNumberIsFloat;
  }
  if (sse.emitRequired || sum.emitRequired) {
    content += hasRequiredFields;
  }
  if (sse.emitLiteral || sum.emitLiteral) {
    content += hasLiteralValue;
  }

  let text = helpers.contentPreamble(pkg);
  text += imports.text();
  text += content;

  return text;
}

/**
 * creates the JSON un/marshalling implementations for unions used as sum types
 *
 * @param unions the union types to inspect
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the generated content and flags indicating which JSON helpers are needed
 */
function generateSerdeSumType(
  unions: Array<go.UnionStruct>,
  imports: ImportManager,
  indent: helpers.Indentation,
): unmarshalInfo {
  let emitProbe = false;
  let emitFloat = false;
  let emitRequired = false;
  let emitLiteral = false;

  let content = "";
  for (const goUnion of unions) {
    if (!(goUnion.usage & go.UnionStructFlags.SumType)) {
      continue;
    }

    imports.add("errors");
    content += generateMarshalJson(goUnion, indent);
    const result = generateUnmarshalJson(goUnion, indent);
    content += result.content;

    // don't overwrite an existing true with false
    emitProbe = emitProbe ? true : result.emitProbe;
    emitFloat = emitFloat ? true : result.emitFloat;
    emitRequired = emitRequired ? true : result.emitRequired;
    emitLiteral ||= result.emitLiteral;
  }

  return { content, emitProbe, emitFloat, emitRequired, emitLiteral };
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
  emitLiteral: boolean;
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
    emitLiteral: mixedTypes ? mixedTypes.emitLiteral : hasLiteralFields(goUnion.fields),
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

  text += generateObjectMatch(
    goUnion,
    groupJsonObjects(goUnion.fields),
    indent,
    (field, indent) => `${indent.get()}err = json.Unmarshal(data, &${receiver}.${field.name})\n`,
    (indent) => `${indent.get()}err = errors.New("could not determine variant")\n`,
  );
  return text;
}

/**
 * creates the conditional logic for matching JSON object variants.
 * models are probed for literal values and field presence, with a map as the fallback.
 *
 * @param goUnion the union type containing the variants
 * @param jsonObjects the ordered object variants to match, with any map last
 * @param indent the indentation helper currently in scope
 * @param onMatch creates the content for a matching variant
 * @param onNoMatch creates the content when no variant matches and there is no map fallback
 * @param getType returns each variant's wire payload type, defaulting to its field type
 * @returns the text for the conditional logic
 */
function generateObjectMatch(
  goUnion: go.UnionStruct,
  jsonObjects: Array<go.UnionField>,
  indent: helpers.Indentation,
  onMatch: (field: go.UnionField, indent: helpers.Indentation) => string,
  onNoMatch: (indent: helpers.Indentation) => string,
  getType: (field: go.UnionField) => go.WireType = (field) => field.type,
): string {
  // the codegen below assumes at most one map variant, which it treats
  // as the fallback. a union with multiple maps (e.g. Foo | Record<int32>
  // | Record<string>) would generate incorrect code, so fail instead.
  if (jsonObjects.filter((field) => getType(field).kind === "map").length > 1) {
    throw new CodegenError(
      "UnsupportedTsp",
      `union ${goUnion.name} has multiple map variants which is not supported`,
    );
  }

  let ifBlock: helpers.ifBlock = { condition: "", body: () => "" };
  const elseIfBlocks = new Array<helpers.ifBlock>();
  for (let i = 0; i < jsonObjects.length; ++i) {
    const field = jsonObjects[i];
    const type = getType(field);
    if (type.kind === "map") {
      break;
    } else if (!go.isPtr(type, "model")) {
      // we already validated this earlier. however it lets
      // the compiler treat field.type as a model type.
      throw new CodegenError("InternalError", `unexpected union type ${type.kind}`);
    }

    const conditions = getLiteralFields(type.ptrType).map((modelField) => {
      const literal = go.unwrapPtr(modelField.type);
      if (literal.kind !== "literal") {
        throw new CodegenError("InternalError", `expected literal for ${modelField.name}`);
      }
      return `hasLiteralValue[${go.getTypeDeclaration(literal.type, goUnion.pkg)}](rawMsg, ${JSON.stringify(modelField.serializedName)}, ${helpers.formatLiteralValue(literal, false)})`;
    });
    conditions.push(`hasRequiredFields(rawMsg, ${getJsonFieldsForProbe(type.ptrType)})`);
    const condition = conditions.join(" && ");
    const body = (indent: helpers.Indentation) => onMatch(field, indent);
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
  if (getType(jsonObjects[jsonObjects.length - 1]).kind === "map") {
    elseBlock.body = (indent) => onMatch(jsonObjects[jsonObjects.length - 1], indent);
  } else {
    elseBlock.body = onNoMatch;
  }

  return `${indent.get()}${helpers.buildIfBlock(indent, ifBlock, elseIfBlocks, elseBlock)}\n`;
}

/**
 * returns the required string and scalar literal fields used to identify a model
 *
 * @param model the model to inspect
 * @returns the fields with literal constraints that can be probed in JSON
 */
function getLiteralFields(model: go.Model): Array<go.ModelField> {
  return model.fields.filter((field) => {
    const type = go.unwrapPtr(field.type);
    return (
      field.annotations.required &&
      type.kind === "literal" &&
      (type.type.kind === "string" || type.type.kind === "scalar")
    );
  });
}

/**
 * determines if any variant's payload is a model with probeable literal fields
 *
 * @param fields the variants to inspect
 * @param getType returns each variant's wire payload type, defaulting to its field type
 * @returns true if any payload model has required string or scalar literal fields
 */
function hasLiteralFields(
  fields: Array<go.UnionField>,
  getType: (field: go.UnionField) => go.WireType = (field) => field.type,
): boolean {
  return fields.some((field) => {
    const type = getType(field);
    return go.isPtr(type, "model") && getLiteralFields(type.ptrType).length > 0;
  });
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
  emitLiteral: boolean;
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
  const groupedObjects = groupJsonObjects(goUnion.fields);
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
    emitLiteral: groupedObjects.length > 1 && hasLiteralFields(groupedObjects),
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
 * models with literal fields are tried first, followed by models with more fields.
 * any untyped object is the last entry.
 *
 * @param fields the variants from which to collect JSON objects
 * @param getType returns each variant's wire payload type
 * @returns an array of JSON object types
 */
function groupJsonObjects(
  fields: Array<go.UnionField>,
  getType: (field: go.UnionField) => go.WireType = (field) => field.type,
): Array<go.UnionField> {
  const objectFields = new Array<go.UnionField>();
  for (const field of fields) {
    const type = getType(field);
    if (type.kind === "map" || go.isPtr(type, "model")) {
      objectFields.push(field);
    }
  }

  // Literal constraints are stronger evidence than field presence.
  // Field count breaks ties; maps remain the fallback.
  objectFields.sort((a, b) => {
    const aType = getType(a);
    const bType = getType(b);
    if (go.isPtr(aType, "model") && go.isPtr(bType, "model")) {
      return (
        getLiteralFields(bType.ptrType).length - getLiteralFields(aType.ptrType).length ||
        bType.ptrType.fields.length - aType.ptrType.fields.length
      );
    } else if (aType.kind === "map" && bType.kind === "map") {
      return 0;
    } else if (aType.kind === "map") {
      return 1;
    } else if (go.isPtr(aType, "model")) {
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

const hasLiteralValue = `
func hasLiteralValue[T comparable](rawMsg map[string]json.RawMessage, field string, expected T) bool {
	var actual *T
	return json.Unmarshal(rawMsg[field], &actual) == nil && actual != nil && *actual == expected
}
`;

/**
 * creates the decode functions for the SSE union types
 *
 * @param unions the union types to inspect
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the generated content and flags indicating which JSON helpers are needed
 */
function generateSerdeSseType(
  unions: Array<go.UnionStruct>,
  imports: ImportManager,
  indent: helpers.Indentation,
): unmarshalInfo {
  const result: unmarshalInfo = {
    content: "",
    emitProbe: false,
    emitFloat: false,
    emitRequired: false,
    emitLiteral: false,
  };
  for (const goUnion of unions) {
    if (!(goUnion.usage & go.UnionStructFlags.SseType)) {
      continue;
    }

    const events = groupSseEvents(goUnion);
    result.content += generateSseDecoder(goUnion, events, imports, indent);
    result.emitRequired ||= events.message.length > 1;
    result.emitLiteral ||=
      events.message.length > 1 && hasLiteralFields(events.message, getSsePayloadType);
  }

  return result;
}

/** the name of the SSE event received when the event field is absent */
const messageEventName = "message";

/** the events within an SSE union, grouped by how they're discriminated */
interface sseEvents {
  /** the events identified by the content of the SSE event field */
  named: Array<go.UnionField>;

  /** the candidates received when the SSE event field is absent */
  message: Array<go.UnionField>;

  /** the unnamed terminal event, identified by the content of the SSE data field */
  terminal?: go.UnionField;
}

/**
 * groups the variants of the specified SSE union by how they're discriminated
 *
 * @param goUnion the union type to inspect
 * @returns the grouped events
 */
function groupSseEvents(goUnion: go.UnionStruct): sseEvents {
  const events: sseEvents = { named: [], message: [] };
  for (const field of goUnion.fields) {
    if (!field.sse) {
      throw new CodegenError(
        "InternalError",
        `missing SSE info for field ${field.name} in union ${goUnion.name}`,
      );
    }

    if (field.sse.name) {
      events.named.push(field);
    } else if (helpers.isSseTerminalSentinel(field)) {
      // the terminal event has no event name so it's identified by its data
      events.terminal = field;
    } else {
      events.message.push(field);
    }
  }

  return events;
}

/**
 * creates the decode function for the specified SSE union type
 *
 * @param goUnion the type for which to emit the function
 * @param events the union's events grouped by how they're discriminated
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the text for the decode function
 */
function generateSseDecoder(
  goUnion: go.UnionStruct,
  events: sseEvents,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/streaming");

  const funcName = `decode${goUnion.name}`;

  const article = goUnion.name.match(/^[aeiou]/i) ? "an" : "a";
  let summary = `${funcName} maps an SSE event to ${article} ${goUnion.name} value.`;
  if (events.terminal) {
    imports.add("io");
    summary += ` The terminal ${getSseTerminalValue(goUnion, events.terminal)} event ends the stream.`;
  }

  let text = helpers.formatDocComment({ summary: summary });
  text += `func ${funcName}(frame streaming.SSEFrame) (${goUnion.name}, bool, error) {\n`;

  if (events.terminal) {
    text += `${indent.get()}${helpers.buildIfBlock(indent, {
      condition: `s := string(frame.Data); s == ${getSseTerminalValue(goUnion, events.terminal)}`,
      body: (indent) => `${indent.get()}return ${goUnion.name}{}, false, io.EOF\n`,
    })}\n`;
  }

  if (!events.named.length && !events.terminal && events.message.length === 1) {
    // every frame is the message event so there's nothing to discriminate on
    text += generateSseEventClause(goUnion, events.message[0], imports, indent);
    text += "}\n\n";
    return text;
  }

  const cases = new Array<helpers.caseStatement>();
  if (events.message.length) {
    // a variant explicitly named message takes precedence for the message event name
    const hasNamedMessage = events.named.some((field) => field.sse?.name === messageEventName);
    cases.push({
      expression: hasNamedMessage ? `""` : `"", "${messageEventName}"`,
      clause: (indent) => generateSseMessageClause(goUnion, events.message, imports, indent),
    });
  }

  for (const named of events.named) {
    // an event named message is also received when the SSE event field is absent
    const expression =
      named.sse!.name === messageEventName && !events.message.length
        ? `"", "${messageEventName}"`
        : `"${named.sse!.name}"`;
    cases.push({
      expression: expression,
      clause: (indent) => generateSseEventClause(goUnion, named, imports, indent),
    });
  }

  imports.add("fmt");
  text += `${indent.get()}${helpers.buildSwitchCase(indent, "frame.Type", cases, {
    clause: (indent) => {
      return `${indent.get()}return ${goUnion.name}{}, false, fmt.Errorf("unknown SSE event %q", frame.Type)\n`;
    },
  })}`;

  text += "}\n\n"; // end func
  return text;
}

/**
 * returns the SSE data payload type, unwrapping an event envelope when present
 *
 * @param field the variant for the event
 * @returns the envelope field's type or the complete variant type
 */
function getSsePayloadType(field: go.UnionField): go.WireType {
  return field.sse?.envelopeField?.type ?? field.type;
}

/**
 * creates the clause that decodes an unnamed SSE event.
 * multiple candidates are distinguished by their JSON object payloads.
 *
 * @param goUnion the union type containing the events
 * @param fields the candidate variants for an unnamed event
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the text for the clause
 */
function generateSseMessageClause(
  goUnion: go.UnionStruct,
  fields: Array<go.UnionField>,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  if (fields.length === 1) {
    return generateSseEventClause(goUnion, fields[0], imports, indent);
  }
  const objects = groupJsonObjects(fields, getSsePayloadType);
  if (objects.length !== fields.length || fields.some((field) => field.sse?.format === "Text")) {
    throw new CodegenError(
      "UnsupportedTsp",
      `multiple unnamed events in union ${goUnion.name} require JSON object payloads`,
    );
  }
  let text = `${indent.get()}var rawMsg map[string]json.RawMessage\n`;
  text += `${indent.get()}${helpers.buildIfBlock(indent, {
    condition: "err := json.Unmarshal(frame.Data, &rawMsg); err != nil",
    body: (indent) => `${indent.get()}return ${goUnion.name}{}, false, err\n`,
  })}\n`;
  text += generateObjectMatch(
    goUnion,
    objects,
    indent,
    (field, indent) => generateSseEventClause(goUnion, field, imports, indent),
    (indent) =>
      `${indent.get()}return ${goUnion.name}{}, false, fmt.Errorf("could not determine variant for ${goUnion.name}")\n`,
    getSsePayloadType,
  );
  return text;
}

/**
 * creates the clause that deserializes the SSE data field into the specified event
 *
 * @param goUnion the union type containing the event
 * @param field the variant for the event to deserialize
 * @param imports the import manager currently in scope
 * @param indent the indentation helper currently in scope
 * @returns the text for the clause
 */
function generateSseEventClause(
  goUnion: go.UnionStruct,
  field: go.UnionField,
  imports: ImportManager,
  indent: helpers.Indentation,
): string {
  const sse = field.sse!;

  // for an event envelope, the data field contains only the payload
  // which is deserialized into the envelope's field
  const payloadType = getSsePayloadType(field);

  let text: string;
  let payloadVar: string;
  if (sse.format === "Text") {
    // the data field is the payload verbatim
    text = `${indent.get()}s := string(frame.Data)\n`;
    payloadVar = "s";
  } else {
    imports.add("encoding/json");
    text = `${indent.get()}var v ${go.getTypeDeclaration(go.unwrapPtr(payloadType), goUnion.pkg)}\n`;
    text += `${indent.get()}${helpers.buildIfBlock(indent, {
      condition: "err := json.Unmarshal(frame.Data, &v); err != nil",
      body: (indent) => `${indent.get()}return ${goUnion.name}{}, false, err\n`,
    })}\n`;
    payloadVar = "v";
  }

  const terminal = sse.terminal ? "true" : "false";
  text += `${indent.get()}return ${goUnion.name}{${field.name}: ${getSseEventValue(goUnion, field, payloadVar)}}, ${terminal}, nil\n`;
  return text;
}

/**
 * returns the expression that assigns the deserialized payload to the union's variant
 *
 * @param goUnion the union type containing the event
 * @param field the variant for the event
 * @param payloadVar the name of the variable containing the payload
 * @returns the text for the expression
 */
function getSseEventValue(
  goUnion: go.UnionStruct,
  field: go.UnionField,
  payloadVar: string,
): string {
  const envelopeField = field.sse?.envelopeField;
  if (envelopeField) {
    const payload = envelopeField.type.kind === "ptr" ? `&${payloadVar}` : payloadVar;
    const envelopeType = go.getTypeDeclaration(go.unwrapPtr(field.type), goUnion.pkg);
    return `&${envelopeType}{${envelopeField.name}: ${payload}}`;
  }

  return field.type.kind === "ptr" ? `&${payloadVar}` : payloadVar;
}

/**
 * returns the value of the data field that identifies the terminal event
 *
 * @param goUnion the union type containing the event
 * @param field the variant for the terminal event
 * @returns the text for the value
 */
function getSseTerminalValue(goUnion: go.UnionStruct, field: go.UnionField): string {
  const literal = go.unwrapPtr(field.type);
  if (literal.kind !== "literal") {
    // without a literal value there's nothing to discriminate the terminal event on
    throw new CodegenError(
      "UnsupportedTsp",
      `unsupported kind ${literal.kind} for the terminal SSE event in union ${goUnion.name}`,
    );
  }

  return helpers.formatLiteralValue(literal, false);
}
