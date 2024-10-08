export type JsonSchema = {
  title?: string;
  id?: string;
  schema?: string;
  $defs?: Record<string, JsonSchemaType>;
} & JsonSchemaObject;

export type ResolvedJsonSchemaType = Exclude<JsonSchemaType, JsonSchemaRef>;

export type JsonSchemaType =
  | JsonSchemaObject
  | JsonSchemaArray
  | JsonSchemaPrimitive
  | JsonSchemaRef;

export interface JsonSchemaBase {
  $id?: string;
}
export interface JsonSchemaObject extends JsonSchemaBase {
  type: "object";
  properties?: Record<string, JsonSchemaType>;
  additionalProperties?: JsonSchemaType | boolean;
  patternProperties?: Record<string, JsonSchemaType>;
  "x-ordering"?: "keep" | "url";
}

export interface JsonSchemaArray extends JsonSchemaBase {
  type: "array";
  items?: JsonSchema;
}
export interface JsonSchemaRef {
  $ref: string;
}
export interface JsonSchemaPrimitive extends JsonSchemaBase {
  type: "number" | "string" | "boolean";
}

export function sortWithJsonSchema<T>(value: T, jsonSchema: JsonSchema, ref?: string): T {
  const schema = ref ? resolveJsonRef(ref, jsonSchema) : jsonSchema;
  return internalSort(value, schema, new JsonSchemaReader(jsonSchema));
}

function internalSort(
  value: unknown,
  relativeSchema: JsonSchemaType | undefined,
  reader: JsonSchemaReader,
): any {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const resolvedRelativeSchema = relativeSchema && resolveSchema(relativeSchema, reader);
  if (Array.isArray(value)) {
    const itemsSchema =
      resolvedRelativeSchema?.type === "array" ? resolvedRelativeSchema.items : undefined;
    return value.map((x) => internalSort(x, itemsSchema, reader));
  }

  const objectSchema = resolvedRelativeSchema as JsonSchemaObject | undefined;

  const properties = objectSchema?.properties && Object.keys(objectSchema.properties);

  const keys = Object.keys(value);

  const ordering = objectSchema?.["x-ordering"];
  if (ordering === "url") {
    keys.sort(compareUrl);
  } else if (ordering !== "keep") {
    keys.sort((a, b) => {
      if (properties) {
        const aIndex = properties.indexOf(a);
        const bIndex = properties.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        } else if (aIndex !== -1) {
          return -1;
        } else if (bIndex !== -1) {
          return 1;
        }
      }

      return defaultCompare(a, b);
    });
  }
  return keys.reduce((o: any, key) => {
    const v = (value as any)[key];
    const propertySchema =
      objectSchema?.properties?.[key] ??
      resolvePatternProperties(key, objectSchema?.patternProperties) ??
      resolveAdditionalProperties(objectSchema?.additionalProperties);
    if (propertySchema !== undefined) {
      o[key] = internalSort(v, propertySchema, reader);
    } else {
      o[key] = v;
    }
    return o;
  }, {});
}

/**
 * Default sort implementation for deterministic sorting.
 */
function defaultCompare(a: number | string, b: number | string) {
  return +(a > b) || -(b > a);
}

/** Sort urls in a specific way so path with field show up before a fixed segment. */
function compareUrl(leftPath: string, rightPath: string) {
  const leftParts = leftPath.split("/").slice(1);
  const rightParts = rightPath.split("/").slice(1);

  for (let i = 0; i < Math.max(leftParts.length, rightParts.length); i++) {
    // Have we exhausted the path parts of one of them?
    if (i === leftParts.length) return -1;
    if (i === rightParts.length) return 1;

    // Does this segment represent a path parameter (field) on either side?
    const leftIsField = leftParts[i][0] === "{";
    const rightIsField = rightParts[i][0] === "{";

    // If both are fields, try the next part regardless of the field name
    // since the field ordering is all that really matters
    if (leftIsField && rightIsField) {
      continue;
    }

    // If only one is a field, it automatically wins
    if (leftIsField || rightIsField) {
      return leftIsField ? -1 : 1;
    }

    // Sort lexicographically
    const result = defaultCompare(leftParts[i], rightParts[i]);
    if (result !== 0) {
      return result;
    }
  }

  // Must be the same
  return 0;
}

function resolveSchema(schema: JsonSchemaType, reader: JsonSchemaReader): ResolvedJsonSchemaType {
  if ("$ref" in schema) {
    return reader.resolveRef(schema.$ref);
  } else {
    return schema;
  }
}

function resolveJsonRef(ref: string, baseSchema: JsonSchema): ResolvedJsonSchemaType {
  const [file, path] = ref.split("#");
  if (file !== "") {
    throw new Error(`JsonSchemaSorter: Not supporting cross file ref: "${ref}".`);
  }
  const segments = path.split("/");
  let current: any = baseSchema;
  for (const segment of segments.slice(1)) {
    if (segment in current) {
      current = current[segment];
    } else {
      throw new Error(`JsonSchemaSorter: ref "${ref}" is invalid`);
    }
  }
  return current;
}
function resolvePatternProperties(
  key: string,
  patternProperties: Record<string, JsonSchemaType> | undefined,
): JsonSchemaType | undefined {
  if (patternProperties === undefined) {
    return undefined;
  }
  for (const [pattern, schema] of Object.entries(patternProperties)) {
    if (key.match(pattern)) {
      return schema;
    }
  }
  return undefined;
}

function resolveAdditionalProperties(
  additionalProperties: boolean | JsonSchemaType | undefined,
): JsonSchemaType | undefined {
  if (typeof additionalProperties === "boolean") {
    return undefined;
  }
  return additionalProperties;
}

class JsonSchemaReader {
  #doc: JsonSchema;
  #defs = new Map<string, JsonSchemaType>();

  constructor(doc: JsonSchema) {
    this.#doc = doc;
    if (doc.$defs) {
      for (const value of Object.values(doc.$defs)) {
        if ("$id" in value && value.$id) {
          this.#defs.set(value.$id, value);
        }
      }
    }
  }

  resolveRef(ref: string): ResolvedJsonSchemaType {
    if (ref.includes("#")) {
      return resolveJsonRef(ref, this.#doc);
    } else {
      const schema = this.#defs.get(ref);
      if (schema === undefined) {
        throw new Error(`JsonSchemaSorter: Cannot find schema with $id ${ref}`);
      }
      if ("$ref" in schema) {
        return this.resolveRef(schema.$ref);
      } else {
        return schema;
      }
    }
  }
}
