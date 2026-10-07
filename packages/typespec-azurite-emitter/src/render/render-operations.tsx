import { code, For, Show, type Children } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { Type } from "@typespec/compiler";
import * as ef from "@typespec/emitter-framework/typescript";
import { TypeExpression } from "@typespec/emitter-framework/typescript";
import type { ServerModel, ServerOperation, ServerResponse, ServerTypeRef } from "../model.js";
import {
  operationMetadataRefkey,
  operationParameterBindingRefkey,
  operationParametersRefkey,
  operationResponseHeaderBindingRefkey,
  operationResponseRefkey,
  operationTypeBindingRefkey,
} from "./refkeys.js";
import { renderFileHeader } from "./type-ref.js";

function requireDeclarationType(type: Type | undefined, context: string): Type {
  if (!type) {
    throw new Error(`${context} is missing its derived TypeSpec declaration type.`);
  }
  return type;
}

function ParametersInterface(props: { operation: ServerOperation }) {
  const op = props.operation;
  return (
    <>
      <ef.InterfaceDeclaration
        export
        name={`${op.name}Parameters`}
        doc={op.doc}
        refkey={operationParametersRefkey(op)}
      >
        <For each={op.parameters}>
          {(param) => (
            <>
              <ts.InterfaceMember
                name={param.name}
                optional={param.optional}
                type={
                  <TypeExpression
                    type={requireDeclarationType(
                      param.declarationType,
                      `Parameter ${op.name}.${param.name}`,
                    )}
                  />
                }
              />
              {code`;`}
              <hbr />
            </>
          )}
        </For>
        <Show when={op.requestBody !== undefined}>
          {() => (
            <>
              <ts.InterfaceMember
                name="body"
                type={
                  <TypeExpression
                    type={requireDeclarationType(
                      op.requestBody!.declarationType,
                      `Request body for ${op.name}`,
                    )}
                  />
                }
              />
              {code`;`}
              <hbr />
            </>
          )}
        </Show>
      </ef.InterfaceDeclaration>
      <hbr />
    </>
  );
}

function ResponseVariant(props: { response: ServerResponse }) {
  const response = props.response;
  return (
    <>
      {code`| `}
      <ts.InterfaceExpression>
        <For each={responseInterfaceMembers(response)} semicolon line enderPunctuation>
          {(member) => member}
        </For>
      </ts.InterfaceExpression>
    </>
  );
}

function ResponseHeaders(props: { response: ServerResponse }) {
  return (
    <ts.InterfaceExpression>
      <For each={props.response.headers} semicolon line enderPunctuation>
        {(header) => (
          <ts.InterfaceMember
            name={header.name}
            optional={header.optional}
            type={
              <TypeExpression
                type={requireDeclarationType(
                  header.declarationType,
                  `Response header ${header.name}`,
                )}
              />
            }
          />
        )}
      </For>
    </ts.InterfaceExpression>
  );
}

function responseInterfaceMembers(response: ServerResponse): Children[] {
  const members: Children[] = [
    <ts.InterfaceMember
      name="statusCode"
      type={
        response.statusCode === "*" ? (
          code`number`
        ) : (
          <ts.ValueExpression jsValue={response.statusCode} />
        )
      }
    />,
  ];
  if (response.headers.length > 0) {
    members.push(
      <ts.InterfaceMember name="headers" type={<ResponseHeaders response={response} />} />,
    );
  }
  if (response.body !== undefined) {
    members.push(
      <ts.InterfaceMember
        name="body"
        type={
          <TypeExpression
            type={requireDeclarationType(response.body.declarationType, "Response body")}
          />
        }
      />,
    );
  }
  return members;
}

function ResponseType(props: { operation: ServerOperation }) {
  const op = props.operation;
  return (
    <>
      <ef.TypeDeclaration export name={`${op.name}Response`} refkey={operationResponseRefkey(op)}>
        <hbr />
        <indent>
          <For each={op.responses} line>
            {(response) => <ResponseVariant response={response} />}
          </For>
        </indent>
      </ef.TypeDeclaration>
      <hbr />
    </>
  );
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
        <ReadonlyMember name="name" type={code`string`} />
        <ReadonlyMember name="wireName" type={code`string`} />
        <ReadonlyMember name="location" type={code`"path" | "query" | "header"`} />
        <ReadonlyMember name="required" type={code`boolean`} />
        <ReadonlyMember
          name="type"
          type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
        />
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration
        export
        name="OperationResponseHeaderBinding"
        refkey={operationResponseHeaderBindingRefkey}
      >
        <ReadonlyMember name="name" type={code`string`} />
        <ReadonlyMember name="wireName" type={code`string`} />
        <ReadonlyMember
          name="type"
          type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
        />
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration export name="OperationResponseMetadata">
        <ReadonlyMember name="statusCode" type={code`number | "*"`} />
        <ReadonlyMember
          name="headers"
          type={
            <>
              readonly <ts.Reference refkey={operationResponseHeaderBindingRefkey} type />
              []
            </>
          }
        />
        <ReadonlyMember
          name="body"
          optional
          type={
            <ts.InterfaceExpression>
              <ReadonlyMember
                name="type"
                type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
              />
            </ts.InterfaceExpression>
          }
        />
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration export name="OperationLiteralQueryParameter">
        <ReadonlyMember name="name" type={code`string`} />
        <ReadonlyMember name="value" type={code`string`} />
      </ef.InterfaceDeclaration>
      <hbr />
      <ef.InterfaceDeclaration export name="OperationMetadata" refkey={operationMetadataRefkey}>
        <ReadonlyMember name="name" type={code`string`} />
        <ReadonlyMember name="verb" type={code`string`} />
        <ReadonlyMember name="rawPath" type={code`string`} />
        <ReadonlyMember name="path" type={code`string`} />
        <ReadonlyMember
          name="literalQueryParameters"
          type={code`readonly OperationLiteralQueryParameter[]`}
        />
        <ReadonlyMember name="requiredQueryParameters" type={code`readonly string[]`} />
        <ReadonlyMember name="requiredHeaderParameters" type={code`readonly string[]`} />
        <ReadonlyMember
          name="parameters"
          type={
            <>
              readonly <ts.Reference refkey={operationParameterBindingRefkey} type />
              []
            </>
          }
        />
        <ReadonlyMember name="hasRequestBody" type={code`boolean`} />
        <ReadonlyMember name="requestBodyContentTypes" type={code`readonly string[]`} />
        <ReadonlyMember
          name="requestBodyParameterPath"
          optional
          type={code`string | readonly string[]`}
        />
        <ReadonlyMember
          name="requestBodyType"
          optional
          type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
        />
        <ReadonlyMember name="responses" type={code`readonly OperationResponseMetadata[]`} />
        <ReadonlyMember name="interfaceName" optional type={code`string`} />
      </ef.InterfaceDeclaration>
      <hbr />
    </>
  );
}

function OperationTypeBindingDeclaration() {
  return (
    <ef.TypeDeclaration export name="OperationTypeBinding" refkey={operationTypeBindingRefkey}>
      <hbr />
      <indent>
        {code`| `}
        <ts.InterfaceExpression>
          <ReadonlyMember
            name="kind"
            type={code`"string" | "number" | "boolean" | "datetime" | "record" | "unknown"`}
          />
        </ts.InterfaceExpression>
        <hbr />
        {code`| `}
        <ts.InterfaceExpression>
          <ReadonlyMember name="kind" type={code`"model"`} />
          <ReadonlyMember name="name" type={code`string`} />
        </ts.InterfaceExpression>
        <hbr />
        {code`| `}
        <ts.InterfaceExpression>
          <ReadonlyMember name="kind" type={code`"literal"`} />
          <ReadonlyMember name="value" type={code`string | number | boolean`} />
        </ts.InterfaceExpression>
        <hbr />
        {code`| `}
        <ts.InterfaceExpression>
          <ReadonlyMember name="kind" type={code`"array"`} />
          <ReadonlyMember
            name="element"
            type={<ts.Reference refkey={operationTypeBindingRefkey} type />}
          />
        </ts.InterfaceExpression>
      </indent>
    </ef.TypeDeclaration>
  );
}

function ReadonlyMember(props: {
  name: string;
  type: Children;
  optional?: boolean;
  doc?: Children;
}) {
  return (
    <>
      <ts.InterfaceMember
        readonly
        name={props.name}
        optional={props.optional}
        doc={props.doc}
        type={props.type}
      />
      {code`;`}
      <hbr />
    </>
  );
}

export interface ObjectPropertyDescriptor {
  name: string;
  value?: Children;
  jsValue?: unknown;
}

export function ObjectProperties(props: { properties: readonly ObjectPropertyDescriptor[] }) {
  return (
    <For each={props.properties} comma line>
      {(property) =>
        "value" in property ? (
          <ts.ObjectProperty name={property.name}>{property.value}</ts.ObjectProperty>
        ) : (
          <ts.ObjectProperty name={property.name} jsValue={property.jsValue} />
        )
      }
    </For>
  );
}

function OperationsMetadata(props: { operations: readonly ServerOperation[] }) {
  return (
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
        <ts.ArrayExpression>
          <For each={props.operations} comma line>
            {(operation) => <OperationMetadata operation={operation} />}
          </For>
        </ts.ArrayExpression>
      }
    />
  );
}

function OperationMetadata(props: { operation: ServerOperation }) {
  const op = props.operation;
  const properties: ObjectPropertyDescriptor[] = [
    { name: "name", jsValue: op.name },
    { name: "verb", jsValue: op.verb },
    { name: "rawPath", jsValue: op.rawPath },
    { name: "path", jsValue: op.path },
    {
      name: "literalQueryParameters",
      value: (
        <ts.ArrayExpression>
          <For each={op.literalQueryParameters} comma line>
            {(literal) => (
              <ts.ObjectExpression jsValue={{ name: literal.name, value: literal.value }} />
            )}
          </For>
        </ts.ArrayExpression>
      ),
    },
    {
      name: "requiredQueryParameters",
      jsValue: op.parameters
        .filter((p) => p.location === "query" && !p.optional)
        .map((p) => p.wireName),
    },
    {
      name: "requiredHeaderParameters",
      jsValue: op.parameters
        .filter((p) => p.location === "header" && !p.optional)
        .map((p) => p.wireName),
    },
    {
      name: "parameters",
      value: (
        <ts.ArrayExpression>
          <For each={op.parameters} comma line>
            {(param) => <ParameterMetadata parameter={param} />}
          </For>
        </ts.ArrayExpression>
      ),
    },
    { name: "hasRequestBody", jsValue: op.requestBody !== undefined },
    { name: "requestBodyContentTypes", jsValue: op.requestBody?.contentTypes ?? [] },
  ];

  if (op.requestBody !== undefined) {
    properties.push(
      { name: "requestBodyParameterPath", jsValue: op.requestBody.parameterPath },
      {
        name: "requestBodyType",
        value: <OperationTypeBindingExpression type={op.requestBody.type} />,
      },
    );
  }

  properties.push({
    name: "responses",
    value: (
      <ts.ArrayExpression>
        <For each={op.responses} comma line>
          {(response) => <ResponseMetadata response={response} />}
        </For>
      </ts.ArrayExpression>
    ),
  });

  if (op.interfaceName !== undefined) {
    properties.push({ name: "interfaceName", jsValue: op.interfaceName });
  }

  return (
    <ts.ObjectExpression>
      <ObjectProperties properties={properties} />
    </ts.ObjectExpression>
  );
}

function ParameterMetadata(props: { parameter: ServerOperation["parameters"][number] }) {
  const param = props.parameter;
  return (
    <ts.ObjectExpression>
      <ObjectProperties
        properties={[
          { name: "name", jsValue: param.name },
          { name: "wireName", jsValue: param.wireName },
          { name: "location", jsValue: param.location },
          { name: "required", jsValue: !param.optional },
          { name: "type", value: <OperationTypeBindingExpression type={param.type} /> },
        ]}
      />
    </ts.ObjectExpression>
  );
}

function ResponseMetadata(props: { response: ServerResponse }) {
  const response = props.response;
  const properties: ObjectPropertyDescriptor[] = [
    { name: "statusCode", jsValue: response.statusCode },
    {
      name: "headers",
      value: (
        <ts.ArrayExpression>
          <For each={response.headers} comma line>
            {(header) => (
              <ts.ObjectExpression>
                <ObjectProperties
                  properties={[
                    { name: "name", jsValue: header.name },
                    { name: "wireName", jsValue: header.wireName },
                    { name: "type", value: <OperationTypeBindingExpression type={header.type} /> },
                  ]}
                />
              </ts.ObjectExpression>
            )}
          </For>
        </ts.ArrayExpression>
      ),
    },
  ];
  if (response.body !== undefined) {
    properties.push({
      name: "body",
      value: (
        <ts.ObjectExpression>
          <ObjectProperties
            properties={[
              { name: "type", value: <OperationTypeBindingExpression type={response.body.type} /> },
            ]}
          />
        </ts.ObjectExpression>
      ),
    });
  }
  return (
    <ts.ObjectExpression>
      <ObjectProperties properties={properties} />
    </ts.ObjectExpression>
  );
}

export function OperationTypeBindingExpression(props: { type: ServerTypeRef }) {
  const type = props.type;
  switch (type.kind) {
    case "array":
      return (
        <ts.ObjectExpression>
          <ObjectProperties
            properties={[
              { name: "kind", jsValue: "array" },
              { name: "element", value: <OperationTypeBindingExpression type={type.element} /> },
            ]}
          />
        </ts.ObjectExpression>
      );
    case "literal":
      return <ts.ObjectExpression jsValue={{ kind: "literal", value: type.value }} />;
    case "model":
      return <ts.ObjectExpression jsValue={{ kind: "model", name: type.name }} />;
    case "record":
    case "boolean":
    case "datetime":
    case "number":
    case "string":
    case "unknown":
      return <ts.ObjectExpression jsValue={{ kind: type.kind }} />;
  }
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
            <ParametersInterface operation={op} />
            <ResponseType operation={op} />
          </>
        )}
      </For>
      <MetadataDefinitions />
      <OperationsMetadata operations={serverModel.operations} />
    </ts.SourceFile>
  );
}
