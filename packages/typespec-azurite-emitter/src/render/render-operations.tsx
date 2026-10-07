import { For, code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";
import { operationParametersRefkey, operationResponseRefkey } from "./refkeys.js";

/**
 * Renders the `operations.ts` artifact: per-operation request/response TypeScript declarations.
 * Runtime HTTP/XML metadata is emitted once in `metadata.ts`.
 */
export function renderOperations(serverModel: ServerModel) {
  return (
    <ts.SourceFile path="operations.ts">
      {code`${GENERATED_FILE_HEADER}`}
      <hbr />
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
          </>
        )}
      </For>
    </ts.SourceFile>
  );
}
