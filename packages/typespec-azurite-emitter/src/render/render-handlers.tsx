import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerModel } from "../model.js";
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
      <ts.InterfaceDeclaration export name="Context">
        <ts.InterfaceMember readonly name="contextId" type={code`string`} />
        {code`;`}
      </ts.InterfaceDeclaration>
      <hbr />
      <ts.InterfaceDeclaration export name="IServiceHandler">
        <For each={serverModel.operations} semicolon line enderPunctuation>
          {(op) => {
            const methodName = op.name[0].toLowerCase() + op.name.slice(1);
            return (
              <ts.InterfaceMethod
                name={methodName}
                doc={op.doc}
                parameters={[
                  { name: "params", type: code`${op.name}Parameters` },
                  { name: "context", type: code`Context` },
                ]}
                returnType={code`Promise<${op.name}Response>`}
              />
            );
          }}
        </For>
      </ts.InterfaceDeclaration>
    </ts.SourceFile>
  );
}
