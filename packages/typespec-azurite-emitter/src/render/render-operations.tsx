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
  runtimeImport = "../runtime/serializationRuntime.js",
) {
  return (
    <ts.SourceFile path="operations.ts">
      {code`${GENERATED_FILE_HEADER}`}
      {code`
        export type {
          OperationLiteralQueryParameter,
          OperationMetadata,
          OperationParameterBinding,
          OperationResponseHeaderBinding,
          OperationResponseMetadata,
          OperationTypeBinding,
        } from ${JSON.stringify(runtimeImport)};
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
          <ts.ValueExpression jsValue={serverModel.operations.map(operationMetadataValue)} />
        }
      />
    </ts.SourceFile>
  );
}
