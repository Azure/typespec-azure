import { code, For, Show } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerModel } from "../model.js";
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
            <Show when={model.doc !== undefined}>
              {() => (
                <>
                  {code`/** ${model.doc} */`}
                  <hbr />
                </>
              )}
            </Show>
            {code`export interface ${model.name} {`}
            <hbr />
            <indent>
              <For each={model.properties}>
                {(prop) => (
                  <>
                    <Show when={prop.doc !== undefined}>
                      {() => (
                        <>
                          {code`/** ${prop.doc} */`}
                          <hbr />
                        </>
                      )}
                    </Show>
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
