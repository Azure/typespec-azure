import { SourceDirectory } from "@alloy-js/core";
import type { ServerModel } from "../model.js";
import { renderHandlers } from "./render-handlers.js";
import { renderModels } from "./render-models.js";
import { renderOperations } from "./render-operations.js";
import { renderSerialization } from "./render-serialization.js";

export function AzuriteEmitterOutput(props: { serverModel: ServerModel }) {
  return (
    <SourceDirectory path=".">
      {renderModels(props.serverModel)}
      {renderOperations(props.serverModel)}
      {renderHandlers(props.serverModel)}
      {renderSerialization(props.serverModel)}
    </SourceDirectory>
  );
}
