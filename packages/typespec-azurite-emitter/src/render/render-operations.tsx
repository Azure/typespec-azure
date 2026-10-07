import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type {
  ServerModel,
  ServerOperation,
  ServerResponse,
  ServerResponseHeader,
  ServerTypeRef,
} from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";
import { operationParametersRefkey, operationResponseRefkey } from "./refkeys.js";

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

export interface OperationMetadataValue {
  readonly name: string;
  readonly verb: string;
  readonly rawPath: string;
  readonly path: string;
  readonly literalQueryParameters: readonly { readonly name: string; readonly value: string }[];
  readonly requiredQueryParameters: readonly string[];
  readonly requiredHeaderParameters: readonly string[];
  readonly parameters: readonly {
    readonly name: string;
    readonly wireName: string;
    readonly location: "path" | "query" | "header";
    readonly required: boolean;
    readonly collectionPrefix?: string;
    readonly type: OperationTypeBindingValue;
  }[];
  readonly hasRequestBody: boolean;
  readonly requestBodyContentTypes: readonly string[];
  readonly requestBodyParameterPath?: string | readonly string[];
  readonly requestBodyType?: OperationTypeBindingValue;
  readonly responses: readonly OperationResponseMetadataValue[];
  readonly interfaceName?: string;
}

export interface OperationTypeBindingValue {
  readonly kind:
    | "string"
    | "number"
    | "boolean"
    | "datetime"
    | "record"
    | "unknown"
    | "model"
    | "literal"
    | "array"
    | "union";
  readonly name?: string;
  readonly value?: string | number | boolean;
  readonly element?: OperationTypeBindingValue;
  readonly variants?: readonly OperationTypeBindingValue[];
}

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

interface OperationResponseMetadataValue {
  readonly statusCode: number | "*";
  readonly headers: readonly {
    readonly name: string;
    readonly wireName: string;
    readonly collectionPrefix?: string;
    readonly type: OperationTypeBindingValue;
  }[];
  readonly body?: {
    readonly type: OperationTypeBindingValue;
  };
}

export function operationMetadataValue(op: ServerOperation): OperationMetadataValue {
  return withoutUndefined({
    name: op.name,
    verb: op.verb,
    rawPath: op.rawPath,
    path: op.path,
    literalQueryParameters: op.literalQueryParameters.map((literal) => ({
      name: literal.name,
      value: literal.value,
    })),
    requiredQueryParameters: op.parameters
      .filter((p) => p.location === "query" && !p.optional)
      .map((p) => p.wireName),
    requiredHeaderParameters: op.parameters
      .filter((p) => p.location === "header" && !p.optional)
      .map((p) => p.wireName),
    parameters: op.parameters.map((param) =>
      withoutUndefined({
        name: param.name,
        wireName: param.wireName,
        location: param.location,
        required: !param.optional,
        collectionPrefix: getHeaderCollectionPrefix(param.wireName),
        type: operationTypeBindingValue(param.type),
      }),
    ),
    hasRequestBody: op.requestBody !== undefined,
    requestBodyContentTypes: op.requestBody?.contentTypes ?? [],
    requestBodyParameterPath: op.requestBody?.parameterPath,
    requestBodyType:
      op.requestBody === undefined ? undefined : operationTypeBindingValue(op.requestBody.type),
    responses: op.responses.map(responseMetadataValue),
    interfaceName: op.interfaceName,
  }) as OperationMetadataValue;
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

function responseMetadataValue(response: ServerResponse): OperationResponseMetadataValue {
  return withoutUndefined({
    statusCode: response.statusCode,
    headers: response.headers.map(responseHeaderMetadataValue),
    body:
      response.body === undefined
        ? undefined
        : { type: operationTypeBindingValue(response.body.type) },
  }) as OperationResponseMetadataValue;
}

function responseHeaderMetadataValue(header: ServerResponseHeader) {
  return withoutUndefined({
    name: header.name,
    wireName: header.wireName,
    collectionPrefix: getHeaderCollectionPrefix(header.wireName),
    type: operationTypeBindingValue(header.type),
  });
}

function getHeaderCollectionPrefix(wireName: string): string | undefined {
  return wireName.toLowerCase() === "x-ms-meta" ? "x-ms-meta-" : undefined;
}

export function operationTypeBindingValue(type: ServerTypeRef): OperationTypeBindingValue {
  switch (type.kind) {
    case "array":
      return { kind: "array", element: operationTypeBindingValue(type.element) };
    case "literal":
      return { kind: "literal", value: type.value };
    case "model":
      return { kind: "model", name: type.name };
    case "record":
      return { kind: "record", element: operationTypeBindingValue(type.element) };
    case "union":
      return { kind: "union", variants: type.variants.map(operationTypeBindingValue) };
    case "boolean":
    case "datetime":
    case "number":
    case "string":
    case "unknown":
      return { kind: type.kind };
  }
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

/**
 * Renders the `operations.ts` artifact: per-operation request/response TS types plus a
 * runtime route-binding metadata table, analogous to Azurite's existing
 * `parameters.ts`/`operation.ts` generated boundary.
 */
export function renderOperations(
  serverModel: ServerModel,
  runtimeImport = "../runtime/serializationRuntime",
) {
  return (
    <ts.SourceFile path="operations.ts">
      {code`${GENERATED_FILE_HEADER}`}
      {code`
        export type {
          OperationLiteralQueryParameter,
          OperationMetadata,
          OperationParameterBinding,
          OperationDescriptor,
          OperationResponseHeaderBinding,
          OperationResponseMetadata,
          OperationTypeBinding,
        } from ${JSON.stringify(runtimeImport)};
        import { defineOperations } from ${JSON.stringify(runtimeImport)};
        import type { OperationMetadata } from ${JSON.stringify(runtimeImport)};
      `}
      <hbr />
      <For each={serverModel.operations} hardline>
        {(op) => (
          <>
            <ef.InterfaceDeclaration
              export
              type={op.parametersModel}
              name={`${op.typeName}Parameters`}
              refkey={operationParametersRefkey(op)}
            />
            <hbr />
            <ef.TypeDeclaration
              export
              type={op.responseUnion}
              name={`${op.typeName}Response`}
              refkey={operationResponseRefkey(op)}
            />
            <hbr />
          </>
        )}
      </For>
      <ts.VarDeclaration
        export
        const
        name="operations"
        type={code`readonly OperationMetadata[]`}
        initializer={
          <>
            defineOperations(
            <ts.ValueExpression jsValue={serverModel.operations.map(operationDescriptorValue)} />)
          </>
        }
      />
    </ts.SourceFile>
  );
}
