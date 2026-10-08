import { For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
import { GeneratedSourceFile } from "./generated-source-file.js";
import {
  operationMetadataRefkey,
  operationParametersRefkey,
  operationResponseRefkey,
} from "./refkeys.js";
import { operationDescriptorValue, operationMetadataConstName } from "./render-metadata.js";
import type { RuntimeSymbols } from "./runtime-symbols.js";

/**
 * Renders the `operations.ts` artifact: per-operation request/response TypeScript declarations
 * with colocated compact HTTP operation descriptors.
 */
export function renderOperations(serverModel: ServerModel, runtimeSymbols: RuntimeSymbols) {
  return (
    <GeneratedSourceFile path="operations.ts">
      <For each={serverModel.operations} hardline>
        {(op) => (
          <>
            <ef.InterfaceDeclaration
              export
              type={op.parametersModel}
              name={`${op.typeName}Parameters`}
              refkey={operationParametersRefkey(op)}
            />
            <hbr />
            <ef.TypeDeclaration
              export
              type={op.responseUnion}
              name={`${op.typeName}Response`}
              refkey={operationResponseRefkey(op)}
            />
            <hbr />
            <ts.VarDeclaration
              export
              const
              name={operationMetadataConstName(op)}
              refkey={operationMetadataRefkey(op)}
              initializer={
                <>
                  <ts.Reference refkey={runtimeSymbols.defineOperation} />(
                  <ts.ValueExpression jsValue={operationDescriptorValue(op)} />)
                </>
              }
            />
            <hbr />
          </>
        )}
      </For>
    </GeneratedSourceFile>
  );
}
