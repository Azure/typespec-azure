import { Output as CoreOutput, SourceDirectory, type Children } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { Output as EmitterFrameworkOutput } from "@typespec/emitter-framework";
import type { ServerModel } from "../model.js";
import { renderHandlers } from "./render-handlers.js";
import { renderModels } from "./render-models.js";
import { renderOperations } from "./render-operations.js";
import { renderSerialization } from "./render-serialization.js";

export function AzuriteEmitterOutput(props: { serverModel: ServerModel; program: Program }) {
  return (
    <AzuriteOutput program={props.program}>
      <AzuriteOutputFiles serverModel={props.serverModel} />
    </AzuriteOutput>
  );
}

function AzuriteOutput(props: { children: Children; program: Program }) {
  return (
    <EmitterFrameworkOutput program={props.program}>
      <SourceDirectory path=".">{props.children}</SourceDirectory>
    </EmitterFrameworkOutput>
  );
}

function AzuriteOutputFiles(props: { serverModel: ServerModel }) {
  return (
    <>
      {renderModels(props.serverModel)}
      {renderOperations(props.serverModel)}
      {renderHandlers(props.serverModel)}
      {renderSerialization(props.serverModel)}
    </>
  );
}

export function AzuriteTestOutput(props: { children: Children }) {
  return <CoreOutput>{props.children}</CoreOutput>;
}
