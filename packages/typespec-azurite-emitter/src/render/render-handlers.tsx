import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
import { GeneratedSourceFile } from "./generated-source-file.js";
import { contextRefkey, operationParametersRefkey, operationResponseRefkey } from "./refkeys.js";

export function renderHandlers(serverModel: ServerModel) {
  return (
    <GeneratedSourceFile path="handlers.ts">
      <ef.InterfaceDeclaration export name="Context" refkey={contextRefkey}>
        <ts.InterfaceMember readonly name="contextId" type={code`string`} />
        {code`;`}
      </ef.InterfaceDeclaration>
      <hbr />
      <ServiceHandlerInterface serverModel={serverModel} />
    </GeneratedSourceFile>
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
                  type: <ts.Reference refkey={operationParametersRefkey(op)} type />,
                },
                { name: "context", type: <ts.Reference refkey={contextRefkey} type /> },
              ]}
              returnType={
                <>
                  Promise&lt;
                  <ts.Reference refkey={operationResponseRefkey(op)} type />
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
