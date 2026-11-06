import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerModel } from "../model.js";
import { GeneratedSourceFile } from "./generated-source-file.js";
import type { RuntimeSymbols } from "./runtime-symbols.js";

/**
 * Renders the service-specific serialization binding. Stable request/response/XML conversion
 * lives in Azurite's handwritten runtime; generated output supplies a consolidated service
 * metadata manifest in `metadata.ts`.
 */
export function renderSerialization(_serverModel: ServerModel, runtimeSymbols: RuntimeSymbols) {
  return (
    <GeneratedSourceFile path="serialization.ts">
      {code`
        import { serviceMetadata } from "./metadata";

        const runtime = `}
      <ts.Reference refkey={runtimeSymbols.createSerializationRuntime} />
      {code`(serviceMetadata);

        export const deserializeRequest = runtime.deserializeRequest;
        export const serializeResponse = runtime.serializeResponse;
        export const hasGeneratedSerialization = runtime.hasGeneratedSerialization;
      `}
    </GeneratedSourceFile>
  );
}
