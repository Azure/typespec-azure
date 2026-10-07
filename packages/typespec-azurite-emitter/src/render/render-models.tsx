import { code, For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import * as ef from "@typespec/emitter-framework/typescript";
import type { ServerModel } from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";
import { modelXmlMetadataRefkey } from "./refkeys.js";
import { modelXmlMetadataConstName, xmlModelDescriptorValue } from "./render-metadata.js";

/**
 * Renders the `models.ts` artifact: one TypeScript interface per named data model
 * referenced by the service's operations (request/response bodies).
 */
export function renderModels(serverModel: ServerModel) {
  return (
    <ts.SourceFile path="models.ts">
      {code`${GENERATED_FILE_HEADER}`}
      {code`import { defineXmlModel } from "../runtime/serializationRuntime";`}
      <hbr />
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
                  defineXmlModel({JSON.stringify(model.name)},{" "}
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
    </ts.SourceFile>
  );
}
