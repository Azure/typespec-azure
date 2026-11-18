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
import { GeneratedSourceFile } from "./generated-source-file.js";
import type { RuntimeSymbols } from "./runtime-symbols.js";

export type OperationTypeDescriptor =
  | "string"
  | "boolean"
  | readonly ["datetime", Extract<ServerTypeRef, { kind: "datetime" }>["encoding"]]
  | "unknown"
  | "number"
  | readonly ["number", NumericConstraintDescriptor]
  | readonly ["model", string]
  | readonly ["literal", string | number | boolean | null]
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
  contentType?: string,
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

// The original tuple format was unversioned. Bump when changing how a runtime
// interprets these descriptors so the companion can reject mismatches.
const descriptorVersion = 2;

/** Renders the service-level metadata aggregator without restating descriptor literals. */
export function renderMetadata(
  serverModel: ServerModel,
  runtimeImport: string,
  runtimeSymbols: RuntimeSymbols,
) {
  const modelMetadataNames = serverModel.models.map(modelXmlMetadataConstName);
  const operationMetadataNames = serverModel.operations.map(operationMetadataConstName);
  return (
    <GeneratedSourceFile path="metadata.ts">
      {/* Alloy's modulePath rewrites local .ts imports to .js. Azurite runs
          the generated sources with ts-node, so value imports must stay extensionless. */}
      {modelMetadataNames.length > 0 && (
        <>
          {code`import { ${modelMetadataNames.join(", ")} } from "./models";`}
          <hbr />
        </>
      )}
      {operationMetadataNames.length > 0 && (
        <>
          {code`import { ${operationMetadataNames.join(", ")} } from "./operations";`}
          <hbr />
        </>
      )}
      <hbr />
      {code`export type { OperationMetadata, ServiceMetadata } from ${JSON.stringify(runtimeImport)};`}
      <hbr />
      {code`export const serviceMetadata: `}
      <ts.Reference refkey={runtimeSymbols.ServiceMetadata} type />
      {code` = `}
      <ts.Reference refkey={runtimeSymbols.defineServiceMetadata} />
      {code`({ descriptorVersion: ${descriptorVersion}, operations: [${operationMetadataNames.join(", ")}], xmlModels: [${modelMetadataNames.join(", ")}] });

      export const operations: readonly `}
      <ts.Reference refkey={runtimeSymbols.OperationMetadata} type />
      {code`[] = serviceMetadata.operations;`}
    </GeneratedSourceFile>
  );
}

export function operationDescriptorValue(op: ServerOperation): OperationDescriptor {
  return [
    op.name,
    op.verb,
    op.rawPath,
    op.parameters.map(parameterDescriptorValue),
    op.requestBody === undefined ? undefined : requestBodyDescriptorValue(op.requestBody),
    op.responses.map(responseDescriptorValue),
    ...optionalSlot(op.interfaceName),
  ];
}

export function operationMetadataConstName(op: ServerOperation): string {
  return `${op.typeName}Metadata`;
}

function requestBodyDescriptorValue(
  requestBody: NonNullable<ServerOperation["requestBody"]>,
): OperationRequestBodyDescriptor {
  return [
    operationTypeDescriptorValue(requestBody.type),
    requestBody.contentTypes,
    ...optionalSlot(requestBody.parameterPath === "body" ? undefined : requestBody.parameterPath),
  ];
}

function parameterDescriptorValue(
  parameter: ServerOperation["parameters"][number],
): OperationParameterDescriptor {
  const required = parameter.optional ? undefined : true;
  return [
    parameter.name,
    parameter.wireName,
    parameter.location,
    operationTypeDescriptorValue(parameter.type),
    ...(parameter.collectionPrefix === undefined
      ? optionalSlot(required)
      : ([required, parameter.collectionPrefix] as const)),
  ];
}

function responseDescriptorValue(response: ServerResponse): OperationResponseDescriptor {
  const headers =
    response.headers.length === 0 ? undefined : response.headers.map(responseHeaderDescriptorValue);
  if (!response.body) return [response.statusCode, ...optionalSlot(headers)];
  const contentType = response.body.contentTypes[0];
  return [
    response.statusCode,
    headers,
    operationTypeDescriptorValue(response.body.type),
    ...optionalSlot(contentType === "application/xml" ? undefined : contentType),
  ];
}

function responseHeaderDescriptorValue(
  header: ServerResponseHeader,
): OperationResponseHeaderDescriptor {
  return [
    header.name,
    header.wireName,
    operationTypeDescriptorValue(header.type),
    ...optionalSlot(header.collectionPrefix),
  ];
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
    case "datetime":
      return ["datetime", type.encoding];
    case "boolean":
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
): XmlPropertyDescriptor {
  const itemName = getArrayItemName(prop.type, prop.wireName, models);
  const mode = prop.xmlAttribute ? "attribute" : prop.xmlUnwrapped ? "unwrapped" : undefined;
  const base = [prop.name, prop.wireName, operationTypeDescriptorValue(prop.type)] as const;
  if (!prop.optional) return [...base, mode, itemName, true];
  if (itemName !== undefined) return [...base, mode, itemName];
  return [...base, ...optionalSlot(mode)];
}

function optionalSlot<const T>(value: T | undefined): [] | [T] {
  return value === undefined ? [] : [value];
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
