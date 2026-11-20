import { Output as CoreOutput, SourceDirectory, type Children } from "@alloy-js/core";
import { Output as EmitterFrameworkOutput } from "@typespec/emitter-framework";
import type { AzuriteEmitterContext } from "../context.js";
import type { ServerModel } from "../model.js";
import { renderHandlers } from "./render-handlers.js";
import { renderMetadata } from "./render-metadata.js";
import { renderModels } from "./render-models.js";
import { renderOperations } from "./render-operations.js";
import { renderSerialization } from "./render-serialization.js";
import { createRuntimeSymbols, type RuntimeSymbols } from "./runtime-symbols.js";

export function AzuriteEmitterOutput(props: {
  serverModel: ServerModel;
  context: AzuriteEmitterContext;
}) {
  const runtimeSymbols = createRuntimeSymbols(props.context.options.runtimeImport);
  return (
    <AzuriteOutput context={props.context} runtimeSymbols={runtimeSymbols}>
      <AzuriteOutputFiles
        serverModel={props.serverModel}
        runtimeImport={props.context.options.runtimeImport}
        runtimeSymbols={runtimeSymbols}
      />
    </AzuriteOutput>
  );
}

function AzuriteOutput(props: {
  children: Children;
  context: AzuriteEmitterContext;
  runtimeSymbols?: RuntimeSymbols;
}) {
  return (
    <EmitterFrameworkOutput
      program={props.context.program}
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
