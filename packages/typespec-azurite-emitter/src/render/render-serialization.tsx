import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerDataModel, ServerModel, ServerOperation, ServerTypeRef } from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";
import {
  operationMetadataRefkey,
  operationParameterBindingRefkey,
  operationResponseHeaderBindingRefkey,
  operationTypeBindingRefkey,
} from "./refkeys.js";
import { operationTypeBindingValue } from "./render-operations.js";

/**
 * Renders Azurite request/response serialization helpers for the first Queue slice.
 * The entrypoints are direct and operation-aware, while trivial no-body operations share
 * metadata-driven binding helpers instead of repeating one serializer per operation.
 */
export function renderSerialization(serverModel: ServerModel) {
  const supportedOperations = serverModel.operations.filter(isSerializationReady);
  return (
    <ts.SourceFile path="serialization.ts">
      {code`
        ${GENERATED_FILE_HEADER}
        import type Context from "../../generated/Context";
        import type { IHandlerParameters } from "../../generated/Context";
        import type IRequest from "../../generated/IRequest";
        import type IResponse from "../../generated/IResponse";
        import { parseXML, stringifyXML } from "../../generated/utils/xml";
        import { operations } from "./operations";
      `}

      <XmlModelMetadata models={serverModel.models} />

      <DeserializeRequest operations={supportedOperations} />

      <SerializeResponse operations={supportedOperations} />

      <HasGeneratedSerialization operations={supportedOperations} />

      <hbr />
      <HelperFunctions operations={supportedOperations} />
    </ts.SourceFile>
  );
}

function isSerializationReady(op: ServerOperation): boolean {
  if (op.requestBody !== undefined && !isSupportedBody(op.requestBody.type)) return false;
  return op.responses.every(
    (response) => response.body === undefined || isSupportedBody(response.body.type),
  );
}

function isSupportedBody(type: ServerTypeRef): boolean {
  return type.kind === "model";
}

export function XmlModelMetadata(props: { models: readonly ServerDataModel[] }) {
  return (
    <>
      {code`
        interface XmlPropertyMetadata {
          readonly name: string;
          readonly wireName: string;
          readonly type: OperationTypeBinding;
          readonly attribute: boolean;
          readonly unwrapped: boolean;
          readonly itemName?: string;
        }

        interface XmlModelMetadata {
          readonly name: string;
          readonly wireName: string;
          readonly properties: readonly XmlPropertyMetadata[];
        }

        const xmlModels: Record<string, XmlModelMetadata> =
      `}
      <ts.ValueExpression jsValue={xmlModelsValue(props.models)} />
      {code`;`}
    </>
  );
}

function xmlModelsValue(models: readonly ServerDataModel[]) {
  return Object.fromEntries(
    models.map((model) => [
      model.name,
      {
        name: model.name,
        wireName: model.wireName,
        properties: model.properties.map((prop) => xmlPropertyMetadataValue(prop, models)),
      },
    ]),
  );
}

function xmlPropertyMetadataValue(
  prop: ServerDataModel["properties"][number],
  models: readonly ServerDataModel[],
) {
  const itemName = getArrayItemName(prop.type, prop.wireName, models);
  return withoutUndefined({
    name: prop.name,
    wireName: prop.wireName,
    type: operationTypeBindingValue(prop.type),
    attribute: prop.xmlAttribute,
    unwrapped: prop.xmlUnwrapped,
    itemName,
  });
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

function getArrayItemName(
  type: ServerTypeRef,
  fallback: string,
  models: readonly ServerDataModel[],
): string | undefined {
  if (type.kind !== "array") return undefined;
  const element = type.element;
  if (element.kind === "model") {
    const model = models.find((candidate) => candidate.name === element.name);
    return model?.wireName ?? element.name;
  }
  return fallback;
}

export function DeserializeRequest(props: { operations: readonly ServerOperation[] }) {
  return (
    <ts.FunctionDeclaration
      export
      async
      name="deserializeRequest"
      parameters={[
        { name: "name", type: code`string` },
        { name: "req", type: code`IRequest` },
        { name: "context", type: code`Context` },
      ]}
      returnType={code`IHandlerParameters | undefined`}
    >
      {code`
        const metadata = getGeneratedOperation(name);
        return metadata === undefined ? undefined : deserializeMetadataRequest(metadata, req, context);
      `}
    </ts.FunctionDeclaration>
  );
}

export function SerializeResponse(props: { operations: readonly ServerOperation[] }) {
  return (
    <ts.FunctionDeclaration
      export
      name="serializeResponse"
      parameters={[
        { name: "name", type: code`string` },
        { name: "res", type: code`IResponse` },
        { name: "handlerResponse", type: code`any` },
      ]}
      returnType={code`boolean`}
    >
      {code`
        const metadata = getGeneratedOperation(name);
        if (metadata === undefined) return false;
        serializeMetadataResponse(metadata, res, handlerResponse);
        return true;
      `}
    </ts.FunctionDeclaration>
  );
}

export function HasGeneratedSerialization(props: { operations: readonly ServerOperation[] }) {
  return (
    <ts.FunctionDeclaration
      export
      name="hasGeneratedSerialization"
      parameters={[{ name: "name", type: code`string` }]}
      returnType={code`boolean`}
    >
      {code`return generatedOperationNames.has(name);`}
    </ts.FunctionDeclaration>
  );
}

function HelperFunctions(props: { operations: readonly ServerOperation[] }) {
  return code`
    const generatedOperationNames = new Set<string>(${(<ts.ValueExpression jsValue={props.operations.map((op) => op.name)} />)});

    function getGeneratedOperation(name: string): ${(<ts.Reference refkey={operationMetadataRefkey} type />)} | undefined {
      if (!generatedOperationNames.has(name)) return undefined;
      return operations.find((operation) => operation.name === name);
    }

    async function deserializeMetadataRequest(metadata: ${(<ts.Reference refkey={operationMetadataRefkey} type />)}, req: IRequest, context: Context): Promise<IHandlerParameters> {
      const parameters: IHandlerParameters = {};
      const headerCollectionValues = new Map<string, Record<string, string | string[]>>();
      for (const parameter of metadata.parameters) {
        if (parameter.location === "path") {
          setParameterValue(parameters, getParameterPath(parameter), deserializePathParameter(parameter, context));
          continue;
        }
        setParameterValue(parameters, getParameterPath(parameter), deserializeParameter(parameter, req, headerCollectionValues));
      }
      if (metadata.requestBodyType !== undefined && metadata.requestBodyParameterPath !== undefined) {
        const body = await deserializeRequestBody(metadata, req);
        setParameterValue(parameters, metadata.requestBodyParameterPath, body);
      }
      return parameters;
    }

    function deserializePathParameter(
      parameter: ${(<ts.Reference refkey={operationParameterBindingRefkey} type />)},
      context: Context,
    ): unknown {
      return deserializeValue(
        parameter.type,
        getContextPathParameter(context, parameter),
        parameter.wireName,
        parameter.required,
      );
    }

    function getContextPathParameter(
      context: Context,
      parameter: ${(<ts.Reference refkey={operationParameterBindingRefkey} type />)},
    ): string | string[] | undefined {
      const value = getContextValue(context, parameter.name) ?? getContextValue(context, parameter.wireName);
      if (value === undefined && parameter.required) {
        throw new TypeError("Required path parameter " + parameter.wireName + " was not provided by dispatch context");
      }
      return value;
    }

    function getContextValue(context: Context, name: string): string | string[] | undefined {
      const source = context as unknown as Record<string, unknown>;
      const value = source[name] ?? (source.context as Record<string, unknown> | undefined)?.[name];
      if (value === undefined || value === null) return undefined;
      return typeof value === "string" || Array.isArray(value) ? value as string | string[] : String(value);
    }

    async function deserializeRequestBody(metadata: ${(<ts.Reference refkey={operationMetadataRefkey} type />)}, req: IRequest): Promise<unknown> {
      const rawBody = await readRequestIntoText(req);
      req.setBody(rawBody);
      if (metadata.requestBodyType?.kind !== "model") return rawBody;
      const contentType = req.getHeader("content-type") ?? metadata.requestBodyContentTypes[0] ?? "";
      if (contentType.toLowerCase().includes("json")) {
        return JSON.parse(rawBody);
      }
      const parsed = (await parseXML(rawBody)) || {};
      return deserializeXmlModel(parsed, metadata.requestBodyType.name);
    }

    function deserializeParameter(
      parameter: ${(<ts.Reference refkey={operationParameterBindingRefkey} type />)},
      req: IRequest,
      headerCollectionValues: Map<string, Record<string, string | string[]> | undefined>,
    ): unknown {
      if (parameter.location === "query") {
        return deserializeValue(parameter.type, req.getQuery(parameter.wireName), parameter.wireName, parameter.required);
      }
      const headerCollectionPrefix = getHeaderCollectionPrefix(parameter.wireName);
      if (headerCollectionPrefix !== undefined) {
        if (!headerCollectionValues.has(headerCollectionPrefix)) {
          headerCollectionValues.set(headerCollectionPrefix, getHeaderCollection(req.getHeaders(), headerCollectionPrefix));
        }
        return headerCollectionValues.get(headerCollectionPrefix);
      }
      return deserializeValue(parameter.type, req.getHeader(parameter.wireName), parameter.wireName, parameter.required);
    }

    function serializeMetadataResponse(metadata: ${(<ts.Reference refkey={operationMetadataRefkey} type />)}, res: IResponse, handlerResponse: any): void {
      const statusCode = handlerResponse.statusCode;
      res.setStatusCode(statusCode);
      const response = metadata.responses.find((candidate) => candidate.statusCode === statusCode) ?? metadata.responses.find((candidate) => candidate.statusCode === "*");
      if (response === undefined) {
        throw new TypeError("Generated TypeSpec serializer for " + metadata.name + " does not include response status code " + statusCode);
      }
      for (const header of response.headers) {
        serializeResponseHeader(res, header, handlerResponse);
      }
      if (response.body !== undefined) {
        serializeResponseBody(res, response.body.type, handlerResponse);
      }
    }

    function serializeResponseBody(res: IResponse, type: ${(<ts.Reference refkey={operationTypeBindingRefkey} type />)}, handlerResponse: any): void {
      if (type.kind !== "model") return;
      const metadata = getXmlModel(type.name);
      const bodyValue = handlerResponse.body;
      const xmlBody = stringifyXML(serializeXmlModel(bodyValue, metadata.name), { rootName: metadata.wireName });
      res.setContentType("application/xml");
      res.getBodyStream().write(xmlBody);
    }

    function getXmlModel(name: string): XmlModelMetadata {
      const metadata = xmlModels[name];
      if (metadata === undefined) {
        throw new TypeError("Generated TypeSpec XML metadata does not include model " + name);
      }
      return metadata;
    }

    function deserializeXmlModel(value: any, modelName: string): Record<string, unknown> {
      const metadata = getXmlModel(modelName);
      const result: Record<string, unknown> = {};
      for (const prop of metadata.properties) {
        const source = prop.attribute ? value?.$?.[prop.wireName] : getXmlPropertyValue(value, prop);
        const deserialized = deserializeXmlValue(source, prop.type, prop);
        if (deserialized !== undefined) {
          result[prop.name] = deserialized;
        }
      }
      return result;
    }

    function getXmlPropertyValue(value: any, prop: XmlPropertyMetadata): unknown {
      if (!prop.unwrapped) return value?.[prop.wireName];
      return value?.[prop.itemName ?? prop.wireName];
    }

    function deserializeXmlValue(value: any, type: ${(<ts.Reference refkey={operationTypeBindingRefkey} type />)}, prop?: XmlPropertyMetadata): unknown {
      if (value === undefined || value === null) return undefined;
      switch (type.kind) {
        case "model":
          return deserializeXmlModel(value, type.name);
        case "array": {
          const rawItems = prop?.unwrapped ? value : value?.[prop?.itemName ?? prop?.wireName ?? "item"];
          const items = Array.isArray(rawItems) ? rawItems : rawItems === undefined ? [] : [rawItems];
          return items.map((item) => deserializeXmlValue(item, type.element));
        }
        case "record":
          return typeof value === "object" ? value : undefined;
        case "number":
          return Number(value);
        case "boolean":
          return value === true || value === "true";
        case "literal":
          return type.value;
        case "datetime":
        case "string":
        case "unknown":
          return String(value);
      }
    }

    function serializeXmlModel(value: any, modelName: string): Record<string, unknown> {
      const metadata = getXmlModel(modelName);
      const result: Record<string, unknown> = {};
      const attributes: Record<string, unknown> = {};
      for (const prop of metadata.properties) {
        const propValue = value?.[prop.name];
        if (propValue === undefined) continue;
        const serialized = serializeXmlValue(propValue, prop.type, prop);
        if (serialized === undefined) continue;
        if (prop.attribute) {
          attributes[prop.wireName] = serialized;
        } else if (prop.unwrapped) {
          result[prop.itemName ?? prop.wireName] = serialized;
        } else {
          result[prop.wireName] = serialized;
        }
      }
      if (Object.keys(attributes).length > 0) {
        result.$ = attributes;
      }
      return result;
    }

    function serializeXmlValue(value: any, type: ${(<ts.Reference refkey={operationTypeBindingRefkey} type />)}, prop?: XmlPropertyMetadata): unknown {
      if (value === undefined) return undefined;
      switch (type.kind) {
        case "model":
          return serializeXmlModel(value, type.name);
        case "array": {
          const items = Array.isArray(value) ? value : [value];
          const serializedItems = items.map((item) => serializeXmlValue(item, type.element));
          if (prop?.unwrapped) return serializedItems;
          return { [prop?.itemName ?? prop?.wireName ?? "item"]: serializedItems };
        }
        case "record":
          return value;
        case "datetime":
          return value instanceof Date ? value.toUTCString() : String(value);
        case "literal":
          return type.value;
        case "boolean":
        case "number":
        case "string":
        case "unknown":
          return value;
      }
    }

    function serializeResponseHeader(res: IResponse, header: ${(<ts.Reference refkey={operationResponseHeaderBindingRefkey} type />)}, handlerResponse: any): void {
      const headerCollectionPrefix = getHeaderCollectionPrefix(header.wireName);
      if (headerCollectionPrefix !== undefined) {
        setHeaderCollection(res, headerCollectionPrefix, handlerResponse.headers?.[header.name]);
        return;
      }
      setHeader(res, header.wireName, serializeValue(header.type, handlerResponse.headers?.[header.name]));
    }

    function deserializeValue(
      type: ${(<ts.Reference refkey={operationTypeBindingRefkey} type />)},
      value: string | string[] | undefined,
      wireName: string,
      required: boolean,
    ): unknown {
      switch (type.kind) {
        case "number":
          return deserializeNumber(value, wireName, required);
        case "boolean":
          return deserializeBoolean(value, wireName, required);
        case "literal":
          return deserializeLiteral(value, type.value, wireName, required);
        case "array":
          return deserializeArray(value, wireName, required, (item) => deserializeArrayItem(type.element, item));
        case "datetime":
        case "model":
        case "record":
        case "string":
        case "union":
        case "unknown":
          return deserializeString(value, wireName, required);
      }
    }

    function deserializeString(value: string | string[] | undefined, wireName: string, required: boolean): string | undefined {
      const normalized = normalizeValue(value);
      if (required && normalized === undefined) {
        throw new TypeError("Required parameter " + wireName + " was not provided");
      }
      return normalized;
    }

    async function readRequestIntoText(req: IRequest): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const segments: string[] = [];
        const bodyStream = req.getBodyStream();
        bodyStream.on("data", (buffer) => segments.push(buffer));
        bodyStream.on("error", reject);
        bodyStream.on("end", () => resolve(segments.join("")));
      });
    }

    function deserializeNumber(value: string | string[] | undefined, wireName: string, required: boolean): number | undefined {
      const normalized = deserializeString(value, wireName, required);
      return normalized === undefined ? undefined : Number(normalized);
    }

    function deserializeBoolean(value: string | string[] | undefined, wireName: string, required: boolean): boolean | string | undefined {
      const normalized = deserializeString(value, wireName, required);
      if (normalized === undefined) return undefined;
      return normalized === "true" ? true : normalized === "false" ? false : normalized;
    }

    function deserializeLiteral(
      value: string | string[] | undefined,
      expected: string | number | boolean,
      wireName: string,
      required: boolean,
    ): string | number | boolean | undefined {
      const normalized = deserializeString(value, wireName, required);
      if (normalized === undefined) return undefined;
      if (String(expected) !== normalized) {
        throw new TypeError("Parameter " + wireName + " expected " + expected + " but received " + normalized);
      }
      return expected;
    }

    function deserializeArray<T>(
      value: string | string[] | undefined,
      wireName: string,
      required: boolean,
      itemDeserializer: (item: string) => T,
    ): T[] | undefined {
      const normalized = deserializeString(value, wireName, required);
      return normalized === undefined ? undefined : normalized.split(",").map(itemDeserializer);
    }

    function deserializeArrayItem(type: ${(<ts.Reference refkey={operationTypeBindingRefkey} type />)}, value: string): unknown {
      switch (type.kind) {
        case "number":
          return Number(value);
        case "boolean":
          return value === "true" ? true : value === "false" ? false : value;
        case "literal":
          return type.value;
        case "array":
          return value.split(",").map((nestedItem) => deserializeArrayItem(type.element, nestedItem));
        case "datetime":
        case "model":
        case "record":
        case "string":
        case "union":
        case "unknown":
          return value;
      }
    }

    function normalizeValue(value: string | string[] | undefined): string | undefined {
      return Array.isArray(value) ? value.join(",") : value;
    }

    function getHeaderCollectionPrefix(wireName: string): string | undefined {
      return wireName.toLowerCase() === "x-ms-meta" ? "x-ms-meta-" : undefined;
    }

    function getHeaderCollection(
      headers: Record<string, string | string[] | undefined>,
      prefix: string,
    ): Record<string, string | string[]> | undefined {
      const values: Record<string, string | string[]> = {};
      for (const [headerName, headerValue] of Object.entries(headers)) {
        if (headerName.toLowerCase().startsWith(prefix.toLowerCase()) && headerValue !== undefined) {
          values[headerName.substring(prefix.length)] = headerValue;
        }
      }
      return Object.keys(values).length === 0 ? undefined : values;
    }

    function serializeValue(type: ${(<ts.Reference refkey={operationTypeBindingRefkey} type />)}, value: unknown): string | number | boolean | undefined {
      if (value === undefined) return undefined;
      switch (type.kind) {
        case "datetime":
          return value instanceof Date ? value.toUTCString() : String(value);
        case "array":
          return Array.isArray(value) ? value.map((item) => serializeValue(type.element, item)).join(",") : String(value);
        case "literal":
          return type.value;
        case "boolean":
        case "number":
        case "model":
        case "record":
        case "string":
        case "union":
        case "unknown":
          return value as string | number | boolean;
      }
    }

    function setHeader(res: IResponse, name: string, value: string | number | boolean | undefined): void {
      if (value !== undefined) {
        res.setHeader(name, value);
      }
    }

    function setHeaderCollection(res: IResponse, prefix: string, value: Record<string, unknown> | undefined): void {
      if (value === undefined) return;
      for (const [suffix, itemValue] of Object.entries(value)) {
        if (itemValue !== undefined) {
          res.setHeader(prefix + suffix, String(itemValue));
        }
      }
    }

    function setParameterValue(
      parameters: IHandlerParameters,
      parameterPath: string | readonly string[],
      parameterValue: unknown,
    ): void {
      if (parameterValue === undefined) return;
      if (typeof parameterPath === "string") {
        parameters[parameterPath] = parameterValue;
        return;
      }
      let leafParent = parameters;
      for (let i = 0; i < parameterPath.length - 1; i++) {
        const currentPropertyName = parameterPath[i];
        if (!leafParent[currentPropertyName]) {
          leafParent[currentPropertyName] = {};
        }
        leafParent = leafParent[currentPropertyName];
      }
      leafParent[parameterPath[parameterPath.length - 1]] = parameterValue;
    }

    function getParameterPath(parameter: ${(<ts.Reference refkey={operationParameterBindingRefkey} type />)}): string {
      return parameter.name;
    }
  `;
}
