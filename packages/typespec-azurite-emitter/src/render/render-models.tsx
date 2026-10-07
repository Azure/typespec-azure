import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";

/**
 * Renders the `models.ts` artifact: one TypeScript interface per named data model
 * referenced by the service's operations (request/response bodies).
 */
export function renderModels(serverModel: ServerModel) {
  return (
    <ts.SourceFile path="models.ts">
      {code`${GENERATED_FILE_HEADER}`}
      <For each={serverModel.models} hardline>
        {(model) => (
          <ef.InterfaceDeclaration export type={model.declarationModel} name={model.name} />
        )}
      </For>
    </ts.SourceFile>
  );
}
