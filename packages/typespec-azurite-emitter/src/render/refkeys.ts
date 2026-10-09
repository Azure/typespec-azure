import { refkey } from "@alloy-js/core";
import type { ServerOperation } from "../model.js";

// Declaration identities used by Alloy to resolve references and synthesize imports; these are not runtime values.
export const contextRefkey = refkey("context");

export function operationParametersRefkey(operation: ServerOperation) {
  return refkey(operation, "parameters");
}

export function operationResponseRefkey(operation: ServerOperation) {
  return refkey(operation, "response");
}

export function operationMetadataRefkey(operation: ServerOperation) {
  return refkey(operation, "metadata");
}

export function modelXmlMetadataRefkey(model: { readonly name: string }) {
  return refkey(model, "xml-metadata");
}
