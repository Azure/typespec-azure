import { createTCGCContext, type TCGCContext } from "@azure-tools/typespec-client-generator-core";
import type { Diagnostic, Program } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import type { NormalizedAzuriteEmitterOptions } from "./options.js";

export interface AzuriteEmitterContext {
  readonly program: Program;
  readonly tk: ReturnType<typeof $>;
  readonly tcgcContext: TCGCContext;
  readonly options: NormalizedAzuriteEmitterOptions;
  readonly diagnostics: Diagnostic[];
}

export function createAzuriteEmitterContext(
  program: Program,
  options: NormalizedAzuriteEmitterOptions,
): AzuriteEmitterContext {
  return {
    program,
    tk: $(program),
    tcgcContext: createTCGCContext(program, "@azure-tools/typespec-azurite-emitter"),
    options,
    diagnostics: [],
  };
}
