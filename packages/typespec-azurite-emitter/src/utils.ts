import { getClientNameOverride } from "@azure-tools/typespec-client-generator-core";
import type { Type } from "@typespec/compiler";
import type { AzuriteEmitterContext } from "./context.js";

export function getName(
  context: AzuriteEmitterContext,
  target: Type,
  fallbackName: string,
): string {
  return getClientNameOverride(context.tcgcContext, target) ?? fallbackName;
}

export function hasNameOverride(context: AzuriteEmitterContext, target: Type): boolean {
  return getClientNameOverride(context.tcgcContext, target) !== undefined;
}
