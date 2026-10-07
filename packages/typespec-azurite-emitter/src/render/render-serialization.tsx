import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import type { ServerModel } from "../model.js";
import { GENERATED_FILE_HEADER } from "./file-header.js";

/**
 * Renders the service-specific serialization binding. Stable request/response/XML conversion
 * lives in Azurite's handwritten runtime; generated output supplies a consolidated service
 * metadata manifest in `metadata.ts`.
 */
export function renderSerialization(
  _serverModel: ServerModel,
  runtimeImport = "../runtime/serializationRuntime",
) {
  return (
    <ts.SourceFile path="serialization.ts">
      {code`
        ${GENERATED_FILE_HEADER}
        import { createSerializationRuntime } from ${JSON.stringify(runtimeImport)};
        import { serviceMetadata } from "./metadata";

        const runtime = createSerializationRuntime(serviceMetadata);

        export const deserializeRequest = runtime.deserializeRequest;
        export const serializeResponse = runtime.serializeResponse;
        export const hasGeneratedSerialization = runtime.hasGeneratedSerialization;
      `}
    </ts.SourceFile>
  );
}
