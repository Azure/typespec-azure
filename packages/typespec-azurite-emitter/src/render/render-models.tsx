import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerDataModel, ServerModel } from "../model.js";
import { renderFileHeader, TypeRef } from "./type-ref.js";

/**
 * Renders the `models.ts` artifact: one TypeScript interface per named data model
 * referenced by the service's operations (request/response bodies).
 */
export function renderModels(serverModel: ServerModel) {
  return (
    <ts.SourceFile path="models.ts">
      {code`${renderFileHeader()}`}
      <For each={serverModel.models} hardline>
        {(model) => <ModelDeclaration model={model} />}
      </For>
    </ts.SourceFile>
  );
}

function ModelDeclaration(props: { model: ServerDataModel }) {
  const model = props.model;
  if (model.declarationModel) {
    return <ef.InterfaceDeclaration export type={model.declarationModel} name={model.name} />;
  }

  return (
    <ef.InterfaceDeclaration export name={model.name} doc={model.doc}>
      <For each={model.properties} semicolon line enderPunctuation>
        {(prop) => (
          <ts.InterfaceMember
            name={prop.name}
            optional={prop.optional}
            doc={prop.doc}
            type={
              <TypeRef
                type={prop.type}
                sourceType={prop.sourceProperty?.type}
                declarationType={prop.declarationProperty?.type}
              />
            }
          />
        )}
      </For>
    </ef.InterfaceDeclaration>
  );
}
