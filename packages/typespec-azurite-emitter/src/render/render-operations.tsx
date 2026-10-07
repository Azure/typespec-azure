import { code, For, Show } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerModel, ServerOperation, ServerResponse, ServerTypeRef } from "../model.js";
import { collectModelRefs, renderFileHeader, renderTypeRef } from "./type-ref.js";

/** Collects every `models.ts`-defined type name referenced anywhere in `serverModel`'s operations. */
function collectReferencedModelNames(serverModel: ServerModel): string[] {
  const names = new Set<string>();
  for (const op of serverModel.operations) {
    for (const param of op.parameters) {
      collectModelRefs(param.type, names);
    }
    if (op.requestBody) {
      collectModelRefs(op.requestBody.type, names);
    }
    for (const response of op.responses) {
      for (const header of response.headers) {
        collectModelRefs(header.type, names);
      }
      if (response.body) {
        collectModelRefs(response.body.type, names);
      }
    }
  }
  return [...names].sort();
}

function ParametersInterface(props: { operation: ServerOperation }) {
  const op = props.operation;
  return (
    <>
      <Show when={op.doc !== undefined}>{() => code`/** ${op.doc} */`}</Show>
      <Show when={op.doc !== undefined}>{() => <hbr />}</Show>
      {code`export interface ${op.name}Parameters {`}
      <hbr />
      <indent>
        <For each={op.parameters}>
          {(param) => (
            <>
              {code`${param.name}${param.optional ? "?" : ""}: ${renderTypeRef(param.type)};`}
              <hbr />
            </>
          )}
        </For>
        <Show when={op.requestBody !== undefined}>
          {() => (
            <>
              {code`body: ${renderTypeRef(op.requestBody!.type)};`}
              <hbr />
            </>
          )}
        </Show>
      </indent>
      {code`}`}
      <hbr />
    </>
  );
}

function ResponseVariant(props: { response: ServerResponse }) {
  const response = props.response;
  return (
    <>
      {code`| {`}
      <hbr />
      <indent>
        {code`statusCode: ${response.statusCode === "*" ? "number" : response.statusCode};`}
        <hbr />
        <Show when={response.headers.length > 0}>
          {() => (
            <>
              {code`headers: {`}
              <hbr />
              <indent>
                <For each={response.headers}>
                  {(header) => (
                    <>
                      {code`${header.name}${header.optional ? "?" : ""}: ${renderTypeRef(header.type)};`}
                      <hbr />
                    </>
                  )}
                </For>
              </indent>
              {code`};`}
              <hbr />
            </>
          )}
        </Show>
        <Show when={response.body !== undefined}>
          {() => (
            <>
              {code`body: ${renderTypeRef(response.body!.type)};`}
              <hbr />
            </>
          )}
        </Show>
      </indent>
      {code`}`}
    </>
  );
}

function ResponseType(props: { operation: ServerOperation }) {
  const op = props.operation;
  return (
    <>
      {code`export type ${op.name}Response =`}
      <hbr />
      <indent>
        <For each={op.responses}>
          {(response) => (
            <>
              <ResponseVariant response={response} />
              <hbr />
            </>
          )}
        </For>
      </indent>
      {code`;`}
      <hbr />
    </>
  );
}

function MetadataDefinitions() {
  return code`
    export type OperationTypeBinding =
      | { readonly kind: "string" | "number" | "boolean" | "datetime" | "record" | "unknown" }
      | { readonly kind: "model"; readonly name: string }
      | { readonly kind: "literal"; readonly value: string | number | boolean }
      | { readonly kind: "array"; readonly element: OperationTypeBinding };

    export interface OperationParameterBinding {
      readonly name: string;
      readonly wireName: string;
      readonly location: "path" | "query" | "header";
      readonly required: boolean;
      readonly type: OperationTypeBinding;
    }

    export interface OperationResponseHeaderBinding {
      readonly name: string;
      readonly wireName: string;
      readonly type: OperationTypeBinding;
    }

    export interface OperationResponseMetadata {
      readonly statusCode: number | "*";
      readonly headers: readonly OperationResponseHeaderBinding[];
      readonly body?: { readonly type: OperationTypeBinding };
    }

    export interface OperationLiteralQueryParameter {
      readonly name: string;
      readonly value: string;
    }

    export interface OperationMetadata {
      readonly name: string;
      readonly verb: string;
      readonly rawPath: string;
      readonly path: string;
      readonly literalQueryParameters: readonly OperationLiteralQueryParameter[];
      readonly requiredQueryParameters: readonly string[];
      readonly requiredHeaderParameters: readonly string[];
      readonly parameters: readonly OperationParameterBinding[];
      readonly hasRequestBody: boolean;
      readonly requestBodyContentTypes: readonly string[];
      readonly requestBodyParameterPath?: string | readonly string[];
      readonly requestBodyType?: OperationTypeBinding;
      readonly responses: readonly OperationResponseMetadata[];
      readonly interfaceName?: string;
    }
  `;
}

function OperationsMetadata(props: { operations: readonly ServerOperation[] }) {
  return (
    <>
      {code`export const operations: readonly OperationMetadata[] = [`}
      <hbr />
      <indent>
        <For each={props.operations}>
          {(operation) => <OperationMetadata operation={operation} />}
        </For>
      </indent>
      {code`];`}
    </>
  );
}

function OperationMetadata(props: { operation: ServerOperation }) {
  const op = props.operation;
  return (
    <>
      {code`{`}
      <hbr />
      <indent>
        {code`
          name: ${JSON.stringify(op.name)},
          verb: ${JSON.stringify(op.verb)},
          rawPath: ${JSON.stringify(op.rawPath)},
          path: ${JSON.stringify(op.path)},
          literalQueryParameters: ${JSON.stringify(op.literalQueryParameters)},
          requiredQueryParameters: ${JSON.stringify(
            op.parameters
              .filter((p) => p.location === "query" && !p.optional)
              .map((p) => p.wireName),
          )},
          requiredHeaderParameters: ${JSON.stringify(
            op.parameters
              .filter((p) => p.location === "header" && !p.optional)
              .map((p) => p.wireName),
          )},
        `}
        {code`parameters: [`}
        <hbr />
        <indent>
          <For each={op.parameters}>
            {(param) => (
              <>
                {code`{ name: ${JSON.stringify(param.name)}, wireName: ${JSON.stringify(param.wireName)}, location: ${JSON.stringify(param.location)}, required: ${param.optional ? "false" : "true"}, type: ${renderOperationTypeBinding(param.type)} },`}
                <hbr />
              </>
            )}
          </For>
        </indent>
        {code`],`}
        <hbr />
        {code`
          hasRequestBody: ${op.requestBody !== undefined ? "true" : "false"},
          requestBodyContentTypes: ${JSON.stringify(op.requestBody?.contentTypes ?? [])},
        `}
        <Show when={op.requestBody !== undefined}>
          {() => (
            <>
              {code`requestBodyParameterPath: ${renderParameterPath(op.requestBody!.parameterPath)},`}
              <hbr />
              {code`requestBodyType: ${renderOperationTypeBinding(op.requestBody!.type)},`}
              <hbr />
            </>
          )}
        </Show>
        {code`responses: [`}
        <hbr />
        <indent>
          <For each={op.responses}>
            {(response) => (
              <>
                <ResponseMetadata response={response} />
                <hbr />
              </>
            )}
          </For>
        </indent>
        {code`],`}
        <hbr />
        <Show when={op.interfaceName !== undefined}>
          {() => (
            <>
              {code`interfaceName: ${JSON.stringify(op.interfaceName)},`}
              <hbr />
            </>
          )}
        </Show>
      </indent>
      {code`},`}
      <hbr />
    </>
  );
}

function ResponseMetadata(props: { response: ServerResponse }) {
  const response = props.response;
  const headers = response.headers
    .map(
      (header) =>
        `{ name: ${JSON.stringify(header.name)}, wireName: ${JSON.stringify(header.wireName)}, type: ${renderOperationTypeBinding(header.type)} }`,
    )
    .join(", ");
  const body = response.body
    ? `, body: { type: ${renderOperationTypeBinding(response.body.type)} }`
    : "";
  return code`{ statusCode: ${JSON.stringify(response.statusCode)}, headers: [${headers}]${body} },`;
}

function renderParameterPath(parameterPath: string | readonly string[]): string {
  return JSON.stringify(parameterPath);
}

function renderOperationTypeBinding(type: ServerTypeRef): string {
  switch (type.kind) {
    case "array":
      return `{ kind: "array", element: ${renderOperationTypeBinding(type.element)} }`;
    case "literal":
      return `{ kind: "literal", value: ${JSON.stringify(type.value)} }`;
    case "model":
      return `{ kind: "model", name: ${JSON.stringify(type.name)} }`;
    case "record":
      return `{ kind: ${JSON.stringify(type.kind)} }`;
    case "boolean":
    case "datetime":
    case "number":
    case "string":
    case "unknown":
      return `{ kind: ${JSON.stringify(type.kind)} }`;
  }
}

/**
 * Renders the `operations.ts` artifact: per-operation request/response TS types plus a
 * runtime route-binding metadata table, analogous to Azurite's existing
 * `parameters.ts`/`operation.ts` generated boundary.
 */
export function renderOperations(serverModel: ServerModel) {
  const referencedModels = collectReferencedModelNames(serverModel);
  return (
    <ts.SourceFile path="operations.ts">
      {code`${renderFileHeader()}`}
      <Show when={referencedModels.length > 0}>
        {() => (
          <>
            {code`import type { ${referencedModels.join(", ")} } from "./models.js";`}
            <hbr />
          </>
        )}
      </Show>
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
