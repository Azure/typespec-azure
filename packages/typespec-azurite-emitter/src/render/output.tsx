import { Output as CoreOutput, SourceDirectory, type Children } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { Output as TypeSpecOutput } from "@typespec/emitter-framework";
import type { ServerModel } from "../model.js";
import { renderHandlers } from "./render-handlers.js";
import { renderModels } from "./render-models.js";
import { renderOperations } from "./render-operations.js";
import { renderSerialization } from "./render-serialization.js";

export function AzuriteEmitterOutput(props: { serverModel: ServerModel; program?: Program }) {
  const output = (
    <SourceDirectory path=".">
      {renderModels(props.serverModel)}
      {renderOperations(props.serverModel)}
      {renderHandlers(props.serverModel)}
      {renderSerialization(props.serverModel)}
    </SourceDirectory>
  );

  if (props.program === undefined) return <CoreOutput>{output}</CoreOutput>;

  return <TypeSpecOutput program={props.program}>{output}</TypeSpecOutput>;
}

export function AzuriteTestOutput(props: { children: Children }) {
  return <CoreOutput>{props.children}</CoreOutput>;
}
