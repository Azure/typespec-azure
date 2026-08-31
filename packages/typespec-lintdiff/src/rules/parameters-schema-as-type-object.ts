import { getUnionAsEnum } from "@azure-tools/typespec-azure-core";
import type { Model, ModelProperty, Program, Scalar, Type } from "@typespec/compiler";
import {
  createRule,
  getEncode,
  getFormat,
  getFriendlyName,
  getLocationContext,
  isArrayModelType,
  isNullType,
  isSecret,
  isTemplateInstance,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const parametersSchemaAsTypeObjectRule = createRule({
  name: "parameters-schema-as-type-object",
  description: "Request bodies must resolve to object schemas.",
  severity: "warning",
  messages: {
    default:
      "Request bodies must resolve to object schemas. Replace this non-object body type with a model.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);

        const body = httpOperation.parameters.body;
        if (body === undefined || body.bodyKind === "multipart") {
          return;
        }

        if (body.bodyKind === "single") {
          const schemaType = getEmittedSchemaType(context.program, body.type);
          if (schemaType === undefined || isObjectSchemaType(schemaType)) {
            return;
          }
        }

        context.reportDiagnostic({
          target:
            body.property && getLocationContext(context.program, body.property).type === "project"
              ? body.property
              : operation,
        });
      },
    };
  },
});

function isObjectSchemaType(type: Type): boolean {
  return type.kind === "Model" && !isArraySchemaType(type);
}

function getEmittedSchemaType(
  program: Program,
  type: Type,
  path: "schema-or-ref" | "schema-for-type" = "schema-or-ref",
): Type | undefined {
  while (type.kind === "Union") {
    const nonNullVariants = [...type.variants.values()]
      .map((variant) => variant.type)
      .filter((variant) => !isNullType(variant));

    if (nonNullVariants.length !== 1) {
      const [unionEnum] = getUnionAsEnum(type);
      return unionEnum ? type : undefined;
    }
    type = nonNullVariants[0];
    path = "schema-or-ref";
  }

  switch (type.kind) {
    case "Intrinsic":
      return undefined;
    case "Scalar":
      return hasEmittedScalarType(program, type) ? type : undefined;
    case "Enum":
      return type.members.size > 0 ? type : undefined;
    case "ModelProperty": {
      if (
        path === "schema-or-ref" &&
        isResolvedSchemaInline(program, type.type) &&
        hasEmittedEncodingType(program, type)
      ) {
        return type;
      }
      return getEmittedSchemaType(program, type.type, path);
    }
    case "UnionVariant":
      return getEmittedSchemaType(program, type.type, "schema-for-type");
    case "Model":
    case "String":
    case "Number":
    case "Boolean":
    case "EnumMember":
    case "Tuple":
      return type;
    case "StringTemplate":
      return path === "schema-or-ref" ? type : undefined;
    default:
      return undefined;
  }
}

function hasEmittedScalarType(program: Program, scalar: Scalar): boolean {
  return getEmittedScalarSchema(program, scalar).hasType;
}

function hasEmittedEncodingType(program: Program, target: Scalar | ModelProperty): boolean {
  const encoding = getEncode(program, target);
  if (!encoding || encoding.type === target) {
    return false;
  }
  const targetFormat = isSecret(program, target) ? "password" : getFormat(program, target);
  const encodedSchema = getEmittedScalarSchema(program, encoding.type);
  return (
    encodedSchema.hasType &&
    Boolean(mergeFormatAndEncoding(targetFormat, encoding.encoding, encodedSchema.format))
  );
}

function isResolvedSchemaInline(program: Program, type: Type): boolean {
  if (type.kind === "ModelProperty") {
    return isResolvedSchemaInline(program, type.type);
  }
  if (!isTypeInline(program, type)) {
    return false;
  }
  if (type.kind === "Union") {
    const nonNullVariants = [...type.variants.values()]
      .map((variant) => variant.type)
      .filter((variant) => !isNullType(variant));
    if (nonNullVariants.length === 1) {
      return isResolvedSchemaInline(program, nonNullVariants[0]);
    }
  }
  return true;
}

function isTypeInline(program: Program, type: Type): boolean {
  if (getFriendlyName(program, type)) {
    return false;
  }
  switch (type.kind) {
    case "Model":
    case "Union":
      return !type.name || isTemplateInstance(type);
    case "Scalar":
      return program.checker.isStdType(type) || isTemplateInstance(type);
    case "Enum":
      return !type.name;
    default:
      return true;
  }
}

interface EmittedScalarSchema {
  hasType: boolean;
  format?: string;
}

function getEmittedScalarSchema(
  program: Program,
  scalar: Scalar,
  visited = new Set<Scalar>(),
): EmittedScalarSchema {
  if (visited.has(scalar)) {
    return { hasType: false };
  }
  const activePath = new Set(visited);
  activePath.add(scalar);

  let schema = program.checker.isStdType(scalar)
    ? getStandardScalarSchema(scalar.name)
    : scalar.baseScalar
      ? getEmittedScalarSchema(program, scalar.baseScalar, activePath)
      : { hasType: false };

  const format = getFormat(program, scalar);
  if (format && isSupportedAutorestFormat(format)) {
    schema = { ...schema, format };
  }
  if (isSecret(program, scalar)) {
    schema = { ...schema, format: "password" };
  }

  const encoding = getEncode(program, scalar);
  if (encoding && encoding.type !== scalar) {
    const encodedSchema = getEmittedScalarSchema(program, encoding.type, activePath);
    const mergedFormat = mergeFormatAndEncoding(
      schema.format,
      encoding.encoding,
      encodedSchema.format,
    );
    if (mergedFormat && isSupportedAutorestFormat(mergedFormat)) {
      schema = {
        hasType: encodedSchema.hasType,
        format: mergedFormat,
      };
    }
  }
  return schema;
}

const allowedAutorestFormats = new Set([
  "int32",
  "int64",
  "float",
  "double",
  "unixtime",
  "decimal",
  "byte",
  "binary",
  "date",
  "date-time",
  "password",
  "char",
  "time",
  "date-time-rfc1123",
  "date-time-rfc7231",
  "duration",
  "uuid",
  "base64url",
  "url",
  "odata-query",
  "certificate",
  "uri",
  "uri-reference",
  "uri-template",
  "email",
  "hostname",
  "ipv4",
  "ipv6",
  "regex",
  "json-pointer",
  "relative-json-pointer",
  "arm-id",
  "duration-constant",
]);

function isSupportedAutorestFormat(format: string): boolean {
  return allowedAutorestFormats.has(format.toLowerCase());
}

function getStandardScalarSchema(name: string): EmittedScalarSchema {
  const formats: Record<string, string | undefined> = {
    boolean: undefined,
    bytes: "byte",
    decimal: "decimal",
    decimal128: "decimal",
    duration: "duration",
    float: undefined,
    float32: "float",
    float64: "double",
    int8: "int8",
    int16: "int16",
    int32: "int32",
    int64: "int64",
    integer: "int64",
    numeric: "int64",
    offsetDateTime: "date-time",
    plainDate: "date",
    plainTime: "time",
    safeint: "int64",
    string: undefined,
    uint8: "uint8",
    uint16: "uint16",
    uint32: "uint32",
    uint64: "uint64",
    url: "uri",
    utcDateTime: "date-time",
  };
  return { hasType: true, format: formats[name] };
}

function mergeFormatAndEncoding(
  format: string | undefined,
  encoding: string | undefined,
  encodeAsFormat: string | undefined,
): string | undefined {
  switch (format) {
    case undefined:
      return encodeAsFormat ?? encoding ?? format;
    case "date-time":
      switch (encoding) {
        case "rfc3339":
          return "date-time";
        case "unixTimestamp":
          return "unixtime";
        case "rfc7231":
          return "date-time-rfc7231";
        default:
          return encoding;
      }
    case "duration":
      return encoding === "ISO8601" ? "duration" : (encodeAsFormat ?? encoding);
    case "byte":
      return encoding === "base64" ? "byte" : (encodeAsFormat ?? encoding ?? format);
    default:
      return encodeAsFormat ?? encoding ?? format;
  }
}

function isArraySchemaType(model: Model): boolean {
  const pending = [model];
  const visited = new Set<Model>();

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (isArrayModelType(current)) {
      return true;
    }
    if (current.baseModel) {
      pending.push(current.baseModel);
    }
    if (current.sourceModel) {
      pending.push(current.sourceModel);
    }
  }
  return false;
}
