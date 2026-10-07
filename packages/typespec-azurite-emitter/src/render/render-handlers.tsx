import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
import { getOperationParametersRefkey, getOperationResponseRefkey } from "./render-operations.js";
import { renderFileHeader } from "./type-ref.js";

export function renderHandlers(serverModel: ServerModel) {
  return (
    <ts.SourceFile path="handlers.ts">
      {code`${renderFileHeader()}`}
      <ef.InterfaceDeclaration export name="Context">
        <ts.InterfaceMember readonly name="contextId" type={code`string`} />
        {code`;`}
      </ef.InterfaceDeclaration>
      <hbr />
      <ServiceHandlerInterface serverModel={serverModel} />
    </ts.SourceFile>
  );
}

export function ServiceHandlerInterface(props: { serverModel: ServerModel }) {
  return (
    <ef.InterfaceDeclaration export name="IServiceHandler">
      <For each={props.serverModel.operations} semicolon line enderPunctuation>
        {(op) => {
          const methodName = op.name[0].toLowerCase() + op.name.slice(1);
          return (
            <ts.InterfaceMethod
              name={methodName}
              doc={op.doc}
              parameters={[
                {
                  name: "params",
                  type: <ts.Reference refkey={getOperationParametersRefkey(op)} type />,
                },
                { name: "context", type: code`Context` },
              ]}
              returnType={
                <>
                  Promise&lt;
                  <ts.Reference refkey={getOperationResponseRefkey(op)} type />
                  &gt;
                </>
              }
            />
          );
        }}
      </For>
    </ef.InterfaceDeclaration>
  );
}
