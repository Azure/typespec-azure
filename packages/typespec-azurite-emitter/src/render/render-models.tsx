import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
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
        {(model) => (
          <ef.InterfaceDeclaration export name={model.name} doc={model.doc}>
            <For each={model.properties} semicolon line enderPunctuation>
              {(prop) => (
                <ts.InterfaceMember
                  name={prop.name}
                  optional={prop.optional}
                  doc={prop.doc}
                  type={<TypeRef type={prop.type} sourceType={prop.sourceProperty?.type} />}
                />
              )}
            </For>
          </ef.InterfaceDeclaration>
        )}
      </For>
    </ts.SourceFile>
  );
}
