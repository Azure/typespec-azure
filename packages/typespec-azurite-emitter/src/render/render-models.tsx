import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerModel } from "../model.js";
import { DocComment } from "./doc-comment.js";
import { renderFileHeader, renderTypeRef } from "./type-ref.js";

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
          <>
            <DocComment doc={model.doc} />
            {code`export interface ${model.name} {`}
            <hbr />
            <indent>
              <For each={model.properties}>
                {(prop) => (
                  <>
                    <DocComment doc={prop.doc} />
                    {code`${prop.name}${prop.optional ? "?" : ""}: ${renderTypeRef(prop.type)};`}
                    <hbr />
                  </>
                )}
              </For>
            </indent>
            {code`}`}
            <hbr />
          </>
        )}
      </For>
    </ts.SourceFile>
  );
}
