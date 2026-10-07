import { code, For, type Children } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { Model, Type, Union } from "@typespec/compiler";
import { useTsp } from "@typespec/emitter-framework";
import * as ef from "@typespec/emitter-framework/typescript";
import type {
  ServerModel,
  ServerOperation,
  ServerResponse,
  ServerResponseHeader,
  ServerTypeRef,
} from "../model.js";
import { renderFileHeader } from "./file-header.js";
import {
  operationMetadataRefkey,
  operationParameterBindingRefkey,
  operationParametersRefkey,
  operationResponseHeaderBindingRefkey,
  operationResponseRefkey,
  operationTypeBindingRefkey,
} from "./refkeys.js";

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
    readonly type: OperationTypeBindingValue;
  }[];
  readonly body?: {
    readonly type: OperationTypeBindingValue;
  };
}

function MetadataDefinitions() {
  return (
    <>
      <OperationTypeBindingDeclaration />
      <hbr />
      <ef.InterfaceDeclaration
        export
        name="OperationParameterBinding"
        refkey={operationParameterBindingRefkey}
      >
        <For each={operationParameterBindingMembers()} semicolon line enderPunctuation>
          {(member) => member}
        </For>
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration
        export
        name="OperationResponseHeaderBinding"
        refkey={operationResponseHeaderBindingRefkey}
      >
        <For each={operationResponseHeaderBindingMembers()} semicolon line enderPunctuation>
          {(member) => member}
        </For>
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration export name="OperationResponseMetadata">
        <For each={operationResponseMetadataMembers()} semicolon line enderPunctuation>
          {(member) => member}
        </For>
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration export name="OperationLiteralQueryParameter">
        <For each={operationLiteralQueryParameterMembers()} semicolon line enderPunctuation>
          {(member) => member}
        </For>
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration export name="OperationMetadata" refkey={operationMetadataRefkey}>
        <For each={operationMetadataMembers()} semicolon line enderPunctuation>
          {(member) => member}
        </For>
      </ef.InterfaceDeclaration>
      <hbr />
    </>
  );
}

function OperationTypeBindingDeclaration() {
  return (
    <ef.TypeDeclaration
      export
      type={useOperationTypeBindingUnion()}
      name="OperationTypeBinding"
      refkey={operationTypeBindingRefkey}
    />
  );
}

function operationParameterBindingMembers(): Children[] {
  return [
    <ts.InterfaceMember readonly name="name" type={code`string`} />,
    <ts.InterfaceMember readonly name="wireName" type={code`string`} />,
    <ts.InterfaceMember readonly name="location" type={code`"path" | "query" | "header"`} />,
    <ts.InterfaceMember readonly name="required" type={code`boolean`} />,
    <ts.InterfaceMember
      readonly
      name="type"
      type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
    />,
  ];
}

function operationResponseHeaderBindingMembers(): Children[] {
  return [
    <ts.InterfaceMember readonly name="name" type={code`string`} />,
    <ts.InterfaceMember readonly name="wireName" type={code`string`} />,
    <ts.InterfaceMember
      readonly
      name="type"
      type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
    />,
  ];
}

function operationResponseMetadataMembers(): Children[] {
  return [
    <ts.InterfaceMember readonly name="statusCode" type={code`number | "*"`} />,
    <ts.InterfaceMember
      readonly
      name="headers"
      type={
        <>
          readonly <ts.Reference refkey={operationResponseHeaderBindingRefkey} type />
          []
        </>
      }
    />,
    <ts.InterfaceMember
      readonly
      name="body"
      optional
      type={
        <ts.InterfaceExpression>
          <For
            each={[
              <ts.InterfaceMember
                readonly
                name="type"
                type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
              />,
            ]}
            semicolon
            line
            enderPunctuation
          >
            {(member) => member}
          </For>
        </ts.InterfaceExpression>
      }
    />,
  ];
}

function operationLiteralQueryParameterMembers(): Children[] {
  return [
    <ts.InterfaceMember readonly name="name" type={code`string`} />,
    <ts.InterfaceMember readonly name="value" type={code`string`} />,
  ];
}

function operationMetadataMembers(): Children[] {
  return [
    <ts.InterfaceMember readonly name="name" type={code`string`} />,
    <ts.InterfaceMember readonly name="verb" type={code`string`} />,
    <ts.InterfaceMember readonly name="rawPath" type={code`string`} />,
    <ts.InterfaceMember readonly name="path" type={code`string`} />,
    <ts.InterfaceMember
      readonly
      name="literalQueryParameters"
      type={code`readonly OperationLiteralQueryParameter[]`}
    />,
    <ts.InterfaceMember readonly name="requiredQueryParameters" type={code`readonly string[]`} />,
    <ts.InterfaceMember readonly name="requiredHeaderParameters" type={code`readonly string[]`} />,
    <ts.InterfaceMember
      readonly
      name="parameters"
      type={
        <>
          readonly <ts.Reference refkey={operationParameterBindingRefkey} type />
          []
        </>
      }
    />,
    <ts.InterfaceMember readonly name="hasRequestBody" type={code`boolean`} />,
    <ts.InterfaceMember readonly name="requestBodyContentTypes" type={code`readonly string[]`} />,
    <ts.InterfaceMember
      readonly
      name="requestBodyParameterPath"
      optional
      type={code`string | readonly string[]`}
    />,
    <ts.InterfaceMember
      readonly
      name="requestBodyType"
      optional
      type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
    />,
    <ts.InterfaceMember
      readonly
      name="responses"
      type={code`readonly OperationResponseMetadata[]`}
    />,
    <ts.InterfaceMember readonly name="interfaceName" optional type={code`string`} />,
  ];
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
    parameters: op.parameters.map((param) => ({
      name: param.name,
      wireName: param.wireName,
      location: param.location,
      required: !param.optional,
      type: operationTypeBindingValue(param.type),
    })),
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
  return {
    name: header.name,
    wireName: header.wireName,
    type: operationTypeBindingValue(header.type),
  };
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

function useOperationTypeBindingUnion(): Union {
  const { $ } = useTsp();
  const union = $.union.create({
    name: "OperationTypeBinding",
    expression: false,
  });

  const primitive = useModelExpression({
    kind: $.union.create({
      variants: {
        string: "string",
        number: "number",
        boolean: "boolean",
        datetime: "datetime",
        unknown: "unknown",
      },
    }),
  });
  const model = useModelExpression({
    kind: $.literal.createString("model"),
    name: $.builtin.string,
  });
  const literal = useModelExpression({
    kind: $.literal.createString("literal"),
    value: $.union.create([$.builtin.string, $.builtin.float64, $.builtin.boolean]),
  });
  const array = useModelExpression({
    kind: $.literal.createString("array"),
    element: union,
  });
  const record = useModelExpression({
    kind: $.literal.createString("record"),
    element: union,
  });
  const unionExpression = useModelExpression({
    kind: $.literal.createString("union"),
    variants: $.array.create(union),
  });

  for (const variant of [
    $.unionVariant.create({ name: "primitive", type: primitive, union }),
    $.unionVariant.create({ name: "model", type: model, union }),
    $.unionVariant.create({ name: "literal", type: literal, union }),
    $.unionVariant.create({ name: "array", type: array, union }),
    $.unionVariant.create({ name: "record", type: record, union }),
    $.unionVariant.create({ name: "union", type: unionExpression, union }),
  ]) {
    union.variants.set(variant.name, variant);
  }

  return union;
}

function useModelExpression(properties: Record<string, Type>): Model {
  const { $ } = useTsp();
  const model = $.model.create({
    properties: {},
    expression: true,
  });

  for (const [name, type] of Object.entries(properties)) {
    const property = $.modelProperty.create({ name, type });
    property.model = model;
    model.properties.set(name, property);
  }

  return model;
}

/**
 * Renders the `operations.ts` artifact: per-operation request/response TS types plus a
 * runtime route-binding metadata table, analogous to Azurite's existing
 * `parameters.ts`/`operation.ts` generated boundary.
 */
export function renderOperations(serverModel: ServerModel) {
  return (
    <ts.SourceFile path="operations.ts">
      {code`${renderFileHeader()}`}
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
      <MetadataDefinitions />
      <ts.VarDeclaration
        export
        const
        name="operations"
        type={
          <>
            readonly <ts.Reference refkey={operationMetadataRefkey} type />
            []
          </>
        }
        initializer={
          <ts.ValueExpression jsValue={serverModel.operations.map(operationMetadataValue)} />
        }
      />
    </ts.SourceFile>
  );
}
