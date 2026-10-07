import { Block, code, For, List } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerDataModel, ServerModel, ServerOperation, ServerTypeRef } from "../model.js";
import {
  getOperationMetadataRefkey,
  getOperationParameterBindingRefkey,
  getOperationResponseHeaderBindingRefkey,
  getOperationTypeBindingRefkey,
  ObjectProperties,
  OperationTypeBindingExpression,
} from "./render-operations.js";
import { renderFileHeader } from "./type-ref.js";

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
        ${renderFileHeader()}
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

      <HelperFunctions />
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
      <ts.ObjectExpression>
        <For each={props.models} comma line>
          {(model) => (
            <ts.ObjectProperty name={model.name}>
              <ts.ObjectExpression>
                <ObjectProperties
                  properties={[
                    { name: "name", jsValue: model.name },
                    { name: "wireName", jsValue: model.wireName },
                    {
                      name: "properties",
                      value: (
                        <ts.ArrayExpression>
                          <For each={model.properties} comma line>
                            {(prop) => <XmlPropertyMetadata prop={prop} models={props.models} />}
                          </For>
                        </ts.ArrayExpression>
                      ),
                    },
                  ]}
                />
              </ts.ObjectExpression>
            </ts.ObjectProperty>
          )}
        </For>
      </ts.ObjectExpression>
      {code`;`}
    </>
  );
}

function XmlPropertyMetadata(props: {
  prop: ServerDataModel["properties"][number];
  models: readonly ServerDataModel[];
}) {
  const prop = props.prop;
  const itemName = getArrayItemName(prop.type, prop.wireName, props.models);
  return (
    <ts.ObjectExpression>
      <ObjectProperties
        properties={[
          { name: "name", jsValue: prop.name },
          { name: "wireName", jsValue: prop.wireName },
          { name: "type", value: <OperationTypeBindingExpression type={prop.type} /> },
          { name: "attribute", jsValue: prop.xmlAttribute },
          { name: "unwrapped", jsValue: prop.xmlUnwrapped },
          ...(itemName === undefined ? [] : [{ name: "itemName", jsValue: itemName }]),
        ]}
      />
    </ts.ObjectExpression>
  );
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
      ]}
      returnType={code`IHandlerParameters | undefined`}
    >
      <SerializationSwitch operations={props.operations} kind="deserialize" />
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
      <SerializationSwitch operations={props.operations} kind="serialize" />
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
      <SerializationSwitch operations={props.operations} kind="has" />
    </ts.FunctionDeclaration>
  );
}

function SerializationSwitch(props: {
  operations: readonly ServerOperation[];
  kind: "deserialize" | "serialize" | "has";
}) {
  return (
    <Block opener="switch (name) {" closer="}">
      <List hardline>
        <For each={props.operations}>
          {(op) => <SerializationSwitchCase operation={op} kind={props.kind} />}
        </For>
        <>
          {code`default:`}
          <indent>
            <hbr />
            {props.kind === "deserialize" ? code`return undefined;` : code`return false;`}
          </indent>
        </>
      </List>
    </Block>
  );
}

function SerializationSwitchCase(props: {
  operation: ServerOperation;
  kind: "deserialize" | "serialize" | "has";
}) {
  switch (props.kind) {
    case "deserialize":
      return (
        <>
          {code`case ${JSON.stringify(props.operation.name)}:`}
          <indent>
            <hbr />
            {code`return deserializeMetadataRequest(getGeneratedOperation(name), req);`}
          </indent>
        </>
      );
    case "serialize":
      return (
        <>
          {code`case ${JSON.stringify(props.operation.name)}:`}
          <indent>
            <hbr />
            {code`serializeMetadataResponse(getGeneratedOperation(name), res, handlerResponse);`}
            <hbr />
            {code`return true;`}
          </indent>
        </>
      );
    case "has":
      return (
        <>
          {code`case ${JSON.stringify(props.operation.name)}:`}
          <indent>
            <hbr />
            {code`return true;`}
          </indent>
        </>
      );
  }
}

function HelperFunctions() {
  return code`
    function getGeneratedOperation(name: string): ${(<ts.Reference refkey={getOperationMetadataRefkey()} type />)} {
      const metadata = operations.find((operation) => operation.name === name);
      if (metadata === undefined) {
        throw new TypeError("Generated TypeSpec serialization metadata does not include operation " + name);
      }
      return metadata;
    }

    async function deserializeMetadataRequest(metadata: ${(<ts.Reference refkey={getOperationMetadataRefkey()} type />)}, req: IRequest): Promise<IHandlerParameters> {
      const parameters: IHandlerParameters = {};
      for (const literal of metadata.literalQueryParameters) {
        setParameterValue(
          parameters,
          literal.name,
          deserializeLiteral(req.getQuery(literal.name), literal.value, literal.name, true),
        );
      }
      const headerCollectionValues = new Map<string, Record<string, string | string[]>>();
      for (const parameter of metadata.parameters) {
        if (parameter.location === "path") continue;
        setParameterValue(parameters, getParameterPath(parameter), deserializeParameter(parameter, req, headerCollectionValues));
      }
      if (metadata.requestBodyType !== undefined && metadata.requestBodyParameterPath !== undefined) {
        const body = await deserializeRequestBody(metadata, req);
        setParameterValue(parameters, metadata.requestBodyParameterPath, body);
        setParameterValue(parameters, "body", req.getBody());
      }
      return parameters;
    }

    async function deserializeRequestBody(metadata: ${(<ts.Reference refkey={getOperationMetadataRefkey()} type />)}, req: IRequest): Promise<unknown> {
      const rawBody = await readRequestIntoText(req);
      req.setBody(rawBody);
      if (metadata.requestBodyType?.kind !== "model") return rawBody;
      const contentType = req.getHeader("content-type") ?? metadata.requestBodyContentTypes[0] ?? "";
      if (contentType.toLowerCase().includes("json")) {
        return JSON.parse(rawBody);
      }
      const parsed = (await parseXML(rawBody)) || {};
      const bodyValue = deserializeXmlModel(parsed, metadata.requestBodyType.name);
      return coerceRequestBodyValue(bodyValue, getXmlModel(metadata.requestBodyType.name));
    }

    function deserializeParameter(
      parameter: ${(<ts.Reference refkey={getOperationParameterBindingRefkey()} type />)},
      req: IRequest,
      headerCollectionValues: Map<string, Record<string, string | string[]>>,
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

    function serializeMetadataResponse(metadata: ${(<ts.Reference refkey={getOperationMetadataRefkey()} type />)}, res: IResponse, handlerResponse: any): void {
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

    function serializeResponseBody(res: IResponse, type: ${(<ts.Reference refkey={getOperationTypeBindingRefkey()} type />)}, handlerResponse: any): void {
      if (type.kind !== "model") return;
      const metadata = getXmlModel(type.name);
      const bodyValue = handlerResponse.body ?? coerceResponseBodyValue(handlerResponse, metadata);
      const xmlBody = stringifyXML(serializeXmlModel(bodyValue, metadata.name), { rootName: metadata.wireName });
      res.setContentType("application/xml");
      res.getBodyStream().write(xmlBody);
    }

    function coerceResponseBodyValue(handlerResponse: any, metadata: XmlModelMetadata): unknown {
      const arrayProperty = metadata.properties.length === 1 && metadata.properties[0].type.kind === "array" ? metadata.properties[0] : undefined;
      if (arrayProperty !== undefined && Array.isArray(handlerResponse)) {
        return { [arrayProperty.name]: handlerResponse };
      }
      return handlerResponse;
    }

    function coerceRequestBodyValue(bodyValue: any, metadata: XmlModelMetadata): unknown {
      const arrayProperty = metadata.properties.length === 1 && metadata.properties[0].type.kind === "array" ? metadata.properties[0] : undefined;
      if (arrayProperty !== undefined) {
        return bodyValue?.[arrayProperty.name];
      }
      return bodyValue;
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

    function deserializeXmlValue(value: any, type: ${(<ts.Reference refkey={getOperationTypeBindingRefkey()} type />)}, prop?: XmlPropertyMetadata): unknown {
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

    function serializeXmlValue(value: any, type: ${(<ts.Reference refkey={getOperationTypeBindingRefkey()} type />)}, prop?: XmlPropertyMetadata): unknown {
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

    function serializeResponseHeader(res: IResponse, header: ${(<ts.Reference refkey={getOperationResponseHeaderBindingRefkey()} type />)}, handlerResponse: any): void {
      const headerCollectionPrefix = getHeaderCollectionPrefix(header.wireName);
      if (headerCollectionPrefix !== undefined) {
        setHeaderCollection(res, headerCollectionPrefix, handlerResponse[header.name]);
        return;
      }
      setHeader(res, header.wireName, serializeValue(header.type, handlerResponse[header.name]));
    }

    function deserializeValue(
      type: ${(<ts.Reference refkey={getOperationTypeBindingRefkey()} type />)},
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

    function deserializeArrayItem(type: ${(<ts.Reference refkey={getOperationTypeBindingRefkey()} type />)}, value: string): unknown {
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
    ): Record<string, string | string[]> {
      const values: Record<string, string | string[]> = {};
      for (const [headerName, headerValue] of Object.entries(headers)) {
        if (headerName.toLowerCase().startsWith(prefix.toLowerCase()) && headerValue !== undefined) {
          values[headerName.substring(prefix.length)] = headerValue;
        }
      }
      return values;
    }

    function serializeValue(type: ${(<ts.Reference refkey={getOperationTypeBindingRefkey()} type />)}, value: unknown): string | number | boolean | undefined {
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

    function getParameterPath(parameter: ${(<ts.Reference refkey={getOperationParameterBindingRefkey()} type />)}): string | readonly string[] {
      if (!parameter.required) return ["options", getHandlerParameterName(parameter)];
      return getHandlerParameterName(parameter);
    }

    function getHandlerParameterName(parameter: ${(<ts.Reference refkey={getOperationParameterBindingRefkey()} type />)}): string {
      if (parameter.wireName.toLowerCase() === "visibilitytimeout") return "visibilitytimeout";
      return parameter.wireName.toLowerCase() === "x-ms-client-request-id" ? "requestId" : parameter.name;
    }
  `;
}
