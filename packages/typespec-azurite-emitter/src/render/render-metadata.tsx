import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type {
  ServerDataModel,
  ServerModel,
  ServerOperation,
  ServerResponse,
  ServerResponseHeader,
  ServerTypeRef,
} from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";

export type OperationTypeDescriptor =
  | "string"
  | "number"
  | "boolean"
  | "datetime"
  | "unknown"
  | readonly ["model", string]
  | readonly ["literal", string | number | boolean]
  | readonly ["array", OperationTypeDescriptor]
  | readonly ["record", OperationTypeDescriptor]
  | readonly ["union", readonly OperationTypeDescriptor[]];

type OperationParameterDescriptor = readonly [
  name: string,
  wireName: string,
  location: "path" | "query" | "header",
  type: OperationTypeDescriptor,
  required?: true,
  collectionPrefix?: string,
];

type OperationResponseHeaderDescriptor = readonly [
  name: string,
  wireName: string,
  type: OperationTypeDescriptor,
  collectionPrefix?: string,
];

type OperationResponseDescriptor = readonly [
  statusCode: number | "*",
  headers?: readonly OperationResponseHeaderDescriptor[],
  bodyType?: OperationTypeDescriptor,
];

type OperationRequestBodyDescriptor = readonly [
  type: OperationTypeDescriptor,
  contentTypes: readonly string[],
  parameterPath?: string | readonly string[],
];

type OperationDescriptor = readonly [
  name: string,
  verb: string,
  rawPath: string,
  parameters: readonly OperationParameterDescriptor[],
  requestBody: OperationRequestBodyDescriptor | undefined,
  responses: readonly OperationResponseDescriptor[],
  interfaceName?: string,
];

type XmlPropertyDescriptor = readonly [
  name: string,
  wireName: string,
  type: OperationTypeDescriptor,
  mode?: "attribute" | "unwrapped",
  itemName?: string,
];

type XmlModelDescriptorMap = Record<
  string,
  readonly [wireName: string, properties: readonly XmlPropertyDescriptor[]]
>;

/**
 * Renders the service-specific runtime metadata manifest. This is the single generated source of
 * truth for HTTP operation bindings and XML wire metadata.
 */
export function renderMetadata(serverModel: ServerModel, runtimeImport: string) {
  return (
    <ts.SourceFile path="metadata.ts">
      {code`
        ${GENERATED_FILE_HEADER}
        export type { OperationMetadata, ServiceMetadata } from ${JSON.stringify(runtimeImport)};
        import {
          defineServiceMetadata,
          type OperationMetadata,
          type ServiceMetadata,
        } from ${JSON.stringify(runtimeImport)};

        export const serviceMetadata: ServiceMetadata = defineServiceMetadata(
      `}
      <ts.ValueExpression jsValue={serviceMetadataDescriptorValue(serverModel)} />
      {code`
        );

        export const operations: readonly OperationMetadata[] = serviceMetadata.operations;
      `}
    </ts.SourceFile>
  );
}

function serviceMetadataDescriptorValue(serverModel: ServerModel) {
  return {
    operations: serverModel.operations.map(operationDescriptorValue),
    xmlModels: xmlModelsValue(serverModel.models),
  };
}

export function operationDescriptorValue(op: ServerOperation): OperationDescriptor {
  return withoutTrailingUndefined([
    op.name,
    op.verb,
    op.rawPath,
    op.parameters.map(parameterDescriptorValue),
    op.requestBody === undefined ? undefined : requestBodyDescriptorValue(op.requestBody),
    op.responses.map(responseDescriptorValue),
    op.interfaceName,
  ]);
}

function requestBodyDescriptorValue(requestBody: NonNullable<ServerOperation["requestBody"]>) {
  return withoutTrailingUndefined([
    operationTypeDescriptorValue(requestBody.type),
    requestBody.contentTypes,
    isDefaultBodyPath(requestBody.parameterPath) ? undefined : requestBody.parameterPath,
  ]) as unknown as OperationRequestBodyDescriptor;
}

function parameterDescriptorValue(parameter: ServerOperation["parameters"][number]) {
  return withoutTrailingUndefined([
    parameter.name,
    parameter.wireName,
    parameter.location,
    operationTypeDescriptorValue(parameter.type),
    parameter.optional ? undefined : true,
    getHeaderCollectionPrefix(parameter.wireName),
  ]) as unknown as OperationParameterDescriptor;
}

function responseDescriptorValue(response: ServerResponse): OperationResponseDescriptor {
  return withoutTrailingUndefined([
    response.statusCode,
    response.headers.length === 0 ? undefined : response.headers.map(responseHeaderDescriptorValue),
    response.body === undefined ? undefined : operationTypeDescriptorValue(response.body.type),
  ]);
}

function responseHeaderDescriptorValue(header: ServerResponseHeader) {
  return withoutTrailingUndefined([
    header.name,
    header.wireName,
    operationTypeDescriptorValue(header.type),
    getHeaderCollectionPrefix(header.wireName),
  ]) as unknown as OperationResponseHeaderDescriptor;
}

export function operationTypeDescriptorValue(type: ServerTypeRef): OperationTypeDescriptor {
  switch (type.kind) {
    case "array":
      return ["array", operationTypeDescriptorValue(type.element)];
    case "literal":
      return ["literal", type.value];
    case "model":
      return ["model", type.name];
    case "record":
      return ["record", operationTypeDescriptorValue(type.element)];
    case "union":
      return ["union", type.variants.map(operationTypeDescriptorValue)];
    case "boolean":
    case "datetime":
    case "number":
    case "string":
    case "unknown":
      return type.kind;
  }
}

function xmlModelsValue(models: readonly ServerDataModel[]) {
  return Object.fromEntries(
    models.map((model) => [
      model.name,
      [model.wireName, model.properties.map((prop) => xmlPropertyMetadataValue(prop, models))],
    ]),
  ) as XmlModelDescriptorMap;
}

function xmlPropertyMetadataValue(
  prop: ServerDataModel["properties"][number],
  models: readonly ServerDataModel[],
) {
  const itemName = getArrayItemName(prop.type, prop.wireName, models);
  return withoutTrailingUndefined([
    prop.name,
    prop.wireName,
    operationTypeDescriptorValue(prop.type),
    prop.xmlAttribute ? "attribute" : prop.xmlUnwrapped ? "unwrapped" : undefined,
    itemName,
  ]) as unknown as XmlPropertyDescriptor;
}

function getHeaderCollectionPrefix(wireName: string): string | undefined {
  return wireName.toLowerCase() === "x-ms-meta" ? "x-ms-meta-" : undefined;
}

function isDefaultBodyPath(path: string | readonly string[]): boolean {
  return path === "body";
}

function withoutTrailingUndefined<T extends readonly unknown[]>(items: T): T {
  const trimmed = [...items];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === undefined) {
    trimmed.pop();
  }
  return trimmed as unknown as T;
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
