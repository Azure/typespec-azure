import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type {
  ServerDataModel,
  ServerModel,
  ServerNumericConstraints,
  ServerOperation,
  ServerResponse,
  ServerResponseHeader,
  ServerTypeRef,
} from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";

export type OperationTypeDescriptor =
  | "string"
  | "boolean"
  | "datetime"
  | "unknown"
  | "number"
  | readonly ["number", NumericConstraintDescriptor]
  | readonly ["model", string]
  | readonly ["literal", string | number | boolean]
  | readonly ["array", OperationTypeDescriptor]
  | readonly ["record", OperationTypeDescriptor]
  | readonly ["union", readonly OperationTypeDescriptor[]];

export interface NumericConstraintDescriptor {
  min?: number;
  max?: number;
  minExclusive?: number;
  maxExclusive?: number;
}

export type OperationParameterDescriptor = readonly [
  name: string,
  wireName: string,
  location: "path" | "query" | "header",
  type: OperationTypeDescriptor,
  required?: true,
  collectionPrefix?: string,
];

export type OperationResponseHeaderDescriptor = readonly [
  name: string,
  wireName: string,
  type: OperationTypeDescriptor,
  collectionPrefix?: string,
];

export type OperationResponseDescriptor = readonly [
  statusCode: number | "*",
  headers?: readonly OperationResponseHeaderDescriptor[],
  bodyType?: OperationTypeDescriptor,
];

export type OperationRequestBodyDescriptor = readonly [
  type: OperationTypeDescriptor,
  contentTypes: readonly string[],
  parameterPath?: string | readonly string[],
];

export type OperationDescriptor = readonly [
  name: string,
  verb: string,
  rawPath: string,
  parameters: readonly OperationParameterDescriptor[],
  requestBody: OperationRequestBodyDescriptor | undefined,
  responses: readonly OperationResponseDescriptor[],
  interfaceName?: string,
];

export type XmlPropertyDescriptor = readonly [
  name: string,
  wireName: string,
  type: OperationTypeDescriptor,
  mode?: "attribute" | "unwrapped",
  itemName?: string,
  required?: true,
];

export type XmlModelDescriptor = readonly [
  wireName: string,
  properties: readonly XmlPropertyDescriptor[],
];

export type NamedXmlModelDescriptor = readonly [name: string, descriptor: XmlModelDescriptor];

/**
 * Renders the service-specific runtime metadata manifest. This is the single generated source of
 * truth for HTTP operation bindings and XML wire metadata.
 */
export function renderMetadata(serverModel: ServerModel, runtimeImport: string) {
  const modelMetadataNames = serverModel.models.map(modelXmlMetadataConstName);
  const operationMetadataNames = serverModel.operations.map(operationMetadataConstName);
  return (
    <ts.SourceFile path="metadata.ts">
      {code`
        import { ${modelMetadataNames.join(", ")} } from "./models";
        import { ${operationMetadataNames.join(", ")} } from "./operations";

        ${GENERATED_FILE_HEADER}
        export type { OperationMetadata, ServiceMetadata } from ${JSON.stringify(runtimeImport)};
        import {
          defineServiceMetadata,
          type OperationMetadata,
          type ServiceMetadata,
        } from ${JSON.stringify(runtimeImport)};

        export const serviceMetadata: ServiceMetadata = defineServiceMetadata({
          operations: [${operationMetadataNames.join(", ")}],
          xmlModels: [${modelMetadataNames.join(", ")}],
        });

        export const operations: readonly OperationMetadata[] = serviceMetadata.operations;
      `}
    </ts.SourceFile>
  );
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

export function operationMetadataConstName(op: ServerOperation): string {
  return `${op.typeName}Metadata`;
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
    case "number":
      return type.constraints === undefined
        ? "number"
        : ["number", numericConstraintDescriptorValue(type.constraints)];
    case "boolean":
    case "datetime":
    case "string":
    case "unknown":
      return type.kind;
  }
}

function numericConstraintDescriptorValue(
  constraints: ServerNumericConstraints,
): NumericConstraintDescriptor {
  return withoutUndefinedProperties({
    min: constraints.min,
    max: constraints.max,
    minExclusive: constraints.minExclusive,
    maxExclusive: constraints.maxExclusive,
  });
}

export function xmlModelDescriptorValue(
  model: ServerDataModel,
  models: readonly ServerDataModel[],
): XmlModelDescriptor {
  return [model.wireName, model.properties.map((prop) => xmlPropertyMetadataValue(prop, models))];
}

export function modelXmlMetadataConstName(model: ServerDataModel): string {
  return `${model.name}XmlMetadata`;
}

export function xmlPropertyMetadataValue(
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
    prop.optional ? undefined : true,
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

function withoutUndefinedProperties<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, propertyValue]) => propertyValue !== undefined),
  ) as T;
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
