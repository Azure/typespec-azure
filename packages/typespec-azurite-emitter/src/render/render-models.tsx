import { For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
import { GeneratedSourceFile } from "./generated-source-file.js";
import { modelXmlMetadataRefkey } from "./refkeys.js";
import { modelXmlMetadataConstName, xmlModelDescriptorValue } from "./render-metadata.js";
import type { RuntimeSymbols } from "./runtime-symbols.js";

/**
 * Renders the `models.ts` artifact: one TypeScript interface per named data model
 * referenced by the service's operations (request/response bodies).
 */
export function renderModels(serverModel: ServerModel, runtimeSymbols: RuntimeSymbols) {
  return (
    <GeneratedSourceFile path="models.ts">
      <For each={serverModel.models} hardline>
        {(model) => (
          <>
            <ef.InterfaceDeclaration export type={model.declarationModel} name={model.name} />
            <hbr />
            <ts.VarDeclaration
              export
              const
              name={modelXmlMetadataConstName(model)}
              refkey={modelXmlMetadataRefkey(model)}
              initializer={
                <>
                  <ts.Reference refkey={runtimeSymbols.defineXmlModel} />(
                  {JSON.stringify(model.name)},{" "}
                  <ts.ValueExpression
                    jsValue={xmlModelDescriptorValue(model, serverModel.models)}
                  />
                  )
                </>
              }
            />
          </>
        )}
      </For>
    </GeneratedSourceFile>
  );
}
