import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerModel } from "../model.js";
import { DocComment } from "./doc-comment.js";
import { renderFileHeader } from "./type-ref.js";

export function renderHandlers(serverModel: ServerModel) {
  return (
    <ts.SourceFile path="handlers.ts">
      {code`${renderFileHeader()}`}
      {code`import type {`}
      <hbr />
      <indent>
        <For each={serverModel.operations}>
          {(op) => (
            <>
              {code`${op.name}Parameters,`}
              <hbr />
            </>
          )}
        </For>
        <For each={serverModel.operations}>
          {(op) => (
            <>
              {code`${op.name}Response,`}
              <hbr />
            </>
          )}
        </For>
      </indent>
      {code`} from "./operations.js";`}
      <hbr />
      {code`
        export interface Context {
          readonly contextId: string;
        }
      `}
      <hbr />
      {code`export interface IServiceHandler {`}
      <hbr />
      <indent>
        <For each={serverModel.operations}>
          {(op) => {
            const methodName = op.name[0].toLowerCase() + op.name.slice(1);
            return (
              <>
                <DocComment doc={op.doc} />
                {code`${methodName}(params: ${op.name}Parameters, context: Context): Promise<${op.name}Response>;`}
                <hbr />
              </>
            );
          }}
        </For>
      </indent>
      {code`}`}
    </ts.SourceFile>
  );
}
