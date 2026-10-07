import {
  createTCGCContext,
  getClientNameOverride,
  type TCGCContext,
} from "@azure-tools/typespec-client-generator-core";
import type { Program, Type } from "@typespec/compiler";

const tcgcContextCache = new WeakMap<Program, TCGCContext>();

function getTcgcContext(program: Program): TCGCContext {
  const existing = tcgcContextCache.get(program);
  if (existing) return existing;
  const context = createTCGCContext(program, "@azure-tools/typespec-azurite-emitter");
  tcgcContextCache.set(program, context);
  return context;
}

export function getName(program: Program, target: Type, fallbackName: string): string {
  return getClientNameOverride(getTcgcContext(program), target) ?? fallbackName;
}
