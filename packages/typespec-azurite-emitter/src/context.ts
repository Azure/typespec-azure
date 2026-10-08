import { createTCGCContext, type TCGCContext } from "@azure-tools/typespec-client-generator-core";
import type { Model, Program } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import type { ServerDataModel } from "./model.js";
import type { NormalizedAzuritePilotEmitterOptions } from "./options.js";

export interface AzuriteEmitterContext {
  readonly program: Program;
  readonly tk: ReturnType<typeof $>;
  readonly tcgcContext: TCGCContext;
  readonly options: NormalizedAzuritePilotEmitterOptions;
  readonly modelRegistry: Map<string, ServerDataModel>;
  readonly anonymousModelNamesByType: WeakMap<Model, string>;
  nextAnonymousModelId: number;
}

export function createAzuriteEmitterContext(
  program: Program,
  options: NormalizedAzuritePilotEmitterOptions,
): AzuriteEmitterContext {
  return {
    program,
    tk: $(program),
    tcgcContext: createTCGCContext(program, "@azure-tools/typespec-azurite-emitter"),
    options,
    modelRegistry: new Map(),
    anonymousModelNamesByType: new WeakMap(),
    nextAnonymousModelId: 1,
  };
}
