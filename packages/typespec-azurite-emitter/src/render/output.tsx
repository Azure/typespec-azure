import { Output as CoreOutput, SourceDirectory, type Children } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { Output as EmitterFrameworkOutput } from "@typespec/emitter-framework";
import type { ServerModel } from "../model.js";
import { renderHandlers } from "./render-handlers.js";
import { renderMetadata } from "./render-metadata.js";
import { renderModels } from "./render-models.js";
import { renderOperations } from "./render-operations.js";
import { renderSerialization } from "./render-serialization.js";
import { createRuntimeSymbols, type RuntimeSymbols } from "./runtime-symbols.js";

export function AzuriteEmitterOutput(props: {
  serverModel: ServerModel;
  program: Program;
  runtimeImport: string;
}) {
  const runtimeSymbols = createRuntimeSymbols(props.runtimeImport);
  return (
    <AzuriteOutput program={props.program} runtimeSymbols={runtimeSymbols}>
      <AzuriteOutputFiles
        serverModel={props.serverModel}
        runtimeImport={props.runtimeImport}
        runtimeSymbols={runtimeSymbols}
      />
    </AzuriteOutput>
  );
}

function AzuriteOutput(props: {
  children: Children;
  program: Program;
  runtimeSymbols?: RuntimeSymbols;
}) {
  return (
    <EmitterFrameworkOutput
      program={props.program}
      externals={props.runtimeSymbols === undefined ? undefined : [props.runtimeSymbols]}
    >
      <SourceDirectory path=".">{props.children}</SourceDirectory>
    </EmitterFrameworkOutput>
  );
}

function AzuriteOutputFiles(props: {
  serverModel: ServerModel;
  runtimeImport: string;
  runtimeSymbols: RuntimeSymbols;
}) {
  return (
    <>
      {renderModels(props.serverModel, props.runtimeSymbols)}
      {renderOperations(props.serverModel, props.runtimeSymbols)}
      {renderMetadata(props.serverModel, props.runtimeImport, props.runtimeSymbols)}
      {renderHandlers(props.serverModel)}
      {renderSerialization(props.serverModel, props.runtimeSymbols)}
    </>
  );
}

export function AzuriteTestOutput(props: { children: Children }) {
  return <CoreOutput>{props.children}</CoreOutput>;
}
