import { fullFormats } from "ajv-formats/dist/formats.js";
import { Ajv2020 as Ajv, type AnySchemaObject, type ValidateFunction } from "ajv/dist/2020.js";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { locationAt, type LoadedExampleFile } from "./loader.js";
import { deriveOperationKey } from "./migrate/operation-key.js";
import { HTTP_METHODS } from "./migrate/swagger-types.js";
import { resolveJsonReference } from "./resolve-ref.js";
import { resolveExampleFiles } from "./resolve/resolve.js";
import { selectApplicable } from "./resolve/select.js";
import type { ExampleDiagnostic } from "./types.js";

type JsonObject = Record<string, unknown>;
type ValuePath = (string | number)[];
type OperationContract = { operation: JsonObject; path: string; pathItem: JsonObject };
const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Validate wire examples against the HTTP schemas emitted from the current TypeSpec program. */
export async function validateApiExamples(
  files: readonly LoadedExampleFile[],
  contracts: ReadonlyMap<string, JsonObject>,
  versionOrder: readonly string[],
): Promise<ExampleDiagnostic[]> {
  const diagnostics: ExampleDiagnostic[] = [];
  const documents = new Map<string, unknown>(
    [...contracts].map(([path, document]) => [resolve(path), document]),
  );
  const createValidator = (direction: "request" | "response") => {
    const ajv = new Ajv({
      allErrors: true,
      strict: false,
      loadSchema: async (uri) => {
        if (!uri.startsWith("file:")) throw new Error(`Cannot load non-file API schema '${uri}'.`);
        const path = fileURLToPath(uri);
        const document = documents.get(path) ?? JSON.parse(await readFile(path, "utf-8"));
        documents.set(path, document);
        if (typeof document === "boolean") return { allOf: [document] };
        if (!isObject(document)) throw new Error(`Invalid API schema document '${uri}'.`);
        return normalizeSchema(document, direction);
      },
    });
    for (const [name, format] of Object.entries(fullFormats)) ajv.addFormat(name, format);
    // ARM IDs are string annotations; schema patterns and constraints still apply.
    ajv.addFormat("arm-id", true);
    return ajv;
  };
  const validators = { request: createValidator("request"), response: createValidator("response") };
  const compiledSchemas = new Map<string, Promise<ValidateFunction>>();
  let schemaIndex = 0;
  const versions = new Map<string, Map<string, OperationContract>>();
  for (const [path, document] of contracts) {
    if (document.swagger !== "2.0") continue;
    const version =
      isObject(document.info) && typeof document.info.version === "string"
        ? document.info.version
        : "unversioned";
    const operations = versions.get(version) ?? new Map<string, OperationContract>();
    for (const item of Object.values(isObject(document.paths) ? document.paths : {})) {
      if (!isObject(item)) continue;
      for (const method of HTTP_METHODS) {
        const operation = item[method];
        if (isObject(operation) && typeof operation.operationId === "string") {
          operations.set(deriveOperationKey(operation.operationId), {
            operation,
            path: resolve(path),
            pathItem: item,
          });
        }
      }
    }
    versions.set(version, operations);
  }
  const order = versionOrder.length > 0 ? versionOrder : [...versions.keys()];

  for (const [version, operations] of versions) {
    if (!order.includes(version)) {
      diagnostics.push({
        code: "missing-service-version",
        severity: "error",
        file: "service.yaml",
        message: `Compiled API version '${version}' is not listed in service.yaml.`,
      });
      continue;
    }
    for (const file of files) {
      const resolved = resolveExampleFiles([file], version, order);
      diagnostics.push(...resolved.diagnostics);
      for (const example of resolved.examples) {
        const variants = file.data[example.operation] as Record<string, unknown>[];
        const entries = variants.filter((entry) => (entry.title ?? "") === (example.title ?? ""));
        const selected = selectApplicable(entries, version, order);
        const index = variants.indexOf(selected!);
        const root = [example.operation, index];
        const report = (path: ValuePath, message: string, code = "example-type-mismatch") => {
          const target = [...root, ...path];
          let location = locationAt(file, target);
          while (!location && target.length > root.length) {
            target.pop();
            location = locationAt(file, target);
          }
          diagnostics.push({
            code,
            severity: "error",
            file: file.path,
            operation: example.operation,
            ...location,
            message: `${example.operation} (${version}) ${path.join(".")}: ${message}`,
          });
        };
        const meta = operations.get(example.operation);
        if (!meta) {
          report([], "Operation does not exist in this API version.", "unknown-example-operation");
          continue;
        }

        async function dereference(value: unknown, path: string) {
          const seen = new Set<string>();
          while (isObject(value) && typeof value.$ref === "string") {
            const key = `${path}:${value.$ref}`;
            if (seen.has(key))
              throw new Error(`Circular API reference '${value.$ref}' in ${path}.`);
            seen.add(key);
            const target = await resolveJsonReference(value.$ref, path, documents);
            value = target.value;
            path = target.file;
          }
          if (!isObject(value)) throw new Error(`Expected an API object in ${path}.`);
          return { value, path };
        }
        async function check(
          schema: unknown,
          value: unknown,
          path: ValuePath,
          source = meta!.path,
        ) {
          if (schema === true) return;
          if (schema === false) {
            report(path, "The API schema does not permit a value.");
            return;
          }
          if (!isObject(schema)) {
            report(path, "The API schema is missing or invalid.", "example-schema-error");
            return;
          }
          const direction = path[0] === "request" ? "request" : "response";
          try {
            const document = documents.get(source);
            const key = `${direction}:${source}:${JSON.stringify(schema)}`;
            let compiled = compiledSchemas.get(key);
            if (!compiled) {
              compiled = validators[direction].compileAsync({
                ...(isObject(document) ? normalizeSchema(document, direction) : {}),
                ...normalizeSchema(schema, direction),
                $id: `${pathToFileURL(source).href}?example-schema=${schemaIndex++}`,
              });
              compiledSchemas.set(key, compiled);
            }
            const validator = await compiled;
            if (!validator(value)) {
              for (const error of validator.errors ?? []) {
                const suffix: ValuePath = error.instancePath
                  .split("/")
                  .slice(1)
                  .map((part) =>
                    /^\d+$/.test(part)
                      ? Number(part)
                      : part.replace(/~1/g, "/").replace(/~0/g, "~"),
                  );
                if (error.keyword === "required") suffix.push(String(error.params.missingProperty));
                if (error.keyword === "unevaluatedProperties") {
                  suffix.push(String(error.params.unevaluatedProperty));
                }
                report(
                  [...path, ...suffix],
                  error.message ?? "Value is incompatible with its API type.",
                );
              }
            }
          } catch (error) {
            report(
              path,
              `Unable to validate API schema: ${error instanceof Error ? error.message : String(error)}`,
              "example-schema-error",
            );
          }
        }
        const parameterRecords = [
          ...(Array.isArray(meta.pathItem.parameters) ? meta.pathItem.parameters : []),
          ...(Array.isArray(meta.operation.parameters) ? meta.operation.parameters : []),
        ];
        let parameters: { value: JsonObject; path: string }[];
        try {
          const resolved = await Promise.all(
            parameterRecords.map((param) => dereference(param, meta.path)),
          );
          for (const { value: parameter } of resolved) {
            if (
              typeof parameter.name !== "string" ||
              !["path", "query", "header", "body", "formData"].includes(String(parameter.in))
            ) {
              throw new Error("An API parameter has no valid name or location.");
            }
          }
          parameters = [
            ...new Map(
              resolved.map((parameter) => [
                `${parameter.value.in}:${
                  parameter.value.in === "header"
                    ? String(parameter.value.name).toLowerCase()
                    : parameter.value.name
                }`,
                parameter,
              ]),
            ).values(),
          ];
        } catch (error) {
          report(
            ["request"],
            `Unable to resolve API parameters: ${String(error)}`,
            "example-schema-error",
          );
          continue;
        }
        const request = isObject(example.request) ? example.request : {};
        for (const bucket of ["path", "query", "headers"] as const) {
          const location = bucket === "headers" ? "header" : bucket;
          const values = isObject(request[bucket]) ? request[bucket] : {};
          for (const [name, value] of Object.entries(values)) {
            const match = parameters.find(
              ({ value: param }) =>
                param.in === location &&
                typeof param.name === "string" &&
                (bucket === "headers"
                  ? param.name.toLowerCase() === name.toLowerCase()
                  : param.name === name),
            );
            if (!match) {
              if (bucket === "headers" && /^(content-type|accept|authorization)$/i.test(name)) {
                await check({ type: "string" }, value, ["request", bucket, name]);
              } else {
                report(["request", bucket, name], "Parameter is not declared at this location.");
              }
            } else {
              const { required: _required, ...schema } = match.value;
              await check(schema, value, ["request", bucket, name], match.path);
            }
          }
          for (const { value: param } of parameters) {
            if (param.in !== location || !param.required || param.name === "api-version") continue;
            const name = String(param.name);
            const present = Object.keys(values).some((key) =>
              bucket === "headers" ? key.toLowerCase() === name.toLowerCase() : key === name,
            );
            if (!present) report(["request", bucket, name], "Required parameter is missing.");
          }
        }
        const body = parameters.find(({ value: param }) => param.in === "body");
        const form = parameters.filter(({ value: param }) => param.in === "formData");
        if (request.body === undefined) {
          if (body?.value.required || form.some(({ value: param }) => param.required))
            report(["request", "body"], "Required request body is missing.");
        } else if (body) {
          await check(body.value.schema, request.body, ["request", "body"], body.path);
        } else if (form.length > 0) {
          if (!isObject(request.body)) {
            report(["request", "body"], "Form request body must be an object.");
          } else {
            for (const [name, value] of Object.entries(request.body)) {
              const field = form.find(({ value: param }) => param.name === name);
              if (!field) report(["request", "body", name], "Form field is not declared.");
              else {
                const { required: _required, ...schema } = field.value;
                await check(schema, value, ["request", "body", name], field.path);
              }
            }
            for (const { value: param } of form) {
              if (param.required && !(String(param.name) in request.body)) {
                report(["request", "body", String(param.name)], "Required form field is missing.");
              }
            }
          }
        } else {
          report(["request", "body"], "Operation does not accept a request body.");
        }
        const responses = isObject(example.responses) ? example.responses : {};
        const contracts = isObject(meta.operation.responses) ? meta.operation.responses : {};
        for (const [status, raw] of Object.entries(responses)) {
          const responseContract =
            contracts[status] ?? contracts[`${status[0]}XX`] ?? contracts.default;
          if (!responseContract) {
            report(["responses", status], "Response status is not declared by the operation.");
            continue;
          }
          const response = isObject(raw) ? raw : {};
          let contract: { value: JsonObject; path: string };
          try {
            contract = await dereference(responseContract, meta.path);
          } catch (error) {
            report(
              ["responses", status],
              `Unable to resolve API response: ${String(error)}`,
              "example-schema-error",
            );
            continue;
          }
          if (response.body !== undefined) {
            if (contract.value.schema !== undefined) {
              await check(
                contract.value.schema,
                response.body,
                ["responses", status, "body"],
                contract.path,
              );
            } else {
              report(["responses", status, "body"], "This response does not have a body.");
            }
          } else if (contract.value.schema !== undefined) {
            report(["responses", status, "body"], "Required response body is missing.");
          }
          const headers = isObject(response.headers) ? response.headers : {};
          const definitions = isObject(contract.value.headers) ? contract.value.headers : {};
          for (const [name, schema] of Object.entries(definitions)) {
            if (
              isObject(schema) &&
              schema.required &&
              !Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase())
            ) {
              report(
                ["responses", status, "headers", name],
                "Required response header is missing.",
              );
            }
          }
          for (const [name, value] of Object.entries(headers)) {
            const definition = Object.entries(definitions).find(
              ([key]) => key.toLowerCase() === name.toLowerCase(),
            )?.[1];
            if (definition) {
              await check(definition, value, ["responses", status, "headers", name], contract.path);
            } else if (/^(content-type|content-length)$/i.test(name)) {
              await check({ type: "string" }, value, ["responses", status, "headers", name]);
            } else {
              report(["responses", status, "headers", name], "Response header is not declared.");
            }
          }
        }
      }
    }
  }
  return diagnostics;
}

/** Adapt Swagger's schema spelling to JSON Schema without changing example data. */
function normalizeSchema(
  value: unknown,
  direction: "request" | "response",
  scope: "value" | "definition" | "composition" = "value",
): AnySchemaObject {
  if (!isObject(value)) return {};
  const normalized: AnySchemaObject = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      (key === "$schema" && typeof item === "string") ||
      (key === "x-nullable" && typeof item === "boolean") ||
      (key === "required" && typeof item === "boolean")
    )
      continue;
    if ((key === "definitions" || key === "properties") && isObject(item)) {
      normalized[key] = Object.fromEntries(
        Object.entries(item).map(([name, schema]) => [
          name,
          isObject(schema)
            ? normalizeSchema(schema, direction, key === "definitions" ? "definition" : "value")
            : schema,
        ]),
      );
      continue;
    }
    if (key === "allOf" && Array.isArray(item)) {
      normalized[key] = item.map((schema) =>
        isObject(schema) ? normalizeSchema(schema, direction, "composition") : schema,
      );
      continue;
    }
    normalized[key] = Array.isArray(item)
      ? item.map((entry) => (isObject(entry) ? normalizeSchema(entry, direction) : entry))
      : isObject(item)
        ? normalizeSchema(item, direction)
        : item;
  }
  if (Array.isArray(value.required) && isObject(value.properties)) {
    const properties = value.properties;
    normalized.required = value.required.filter((name) => {
      const property = properties[String(name)];
      if (!isObject(property)) return true;
      return direction === "request"
        ? property.readOnly !== true
        : property.writeOnly !== true && property["x-ms-secret"] !== true;
    });
  }
  if (normalized.type === "file") normalized.type = "string";
  if (isObject(value["x-ms-enum"]) && value["x-ms-enum"].modelAsString === true) {
    delete normalized.enum;
  }
  if (
    scope === "value" &&
    normalized.additionalProperties === undefined &&
    (normalized.$ref || normalized.properties || normalized.allOf || normalized.type === "object")
  ) {
    normalized.unevaluatedProperties = false;
  }
  for (const [exclusive, inclusive] of [
    ["exclusiveMinimum", "minimum"],
    ["exclusiveMaximum", "maximum"],
  ]) {
    if (typeof normalized[exclusive] === "boolean") {
      if (normalized[exclusive] && typeof normalized[inclusive] === "number") {
        normalized[exclusive] = normalized[inclusive];
        delete normalized[inclusive];
      } else {
        delete normalized[exclusive];
      }
    }
  }
  return value["x-nullable"] === true ? { anyOf: [normalized, { type: "null" }] } : normalized;
}
