import { refkey } from "@alloy-js/core";
import type { ServerOperation } from "../model.js";

// Declaration identities used by Alloy to resolve references and synthesize imports; these are not runtime values.
export const contextRefkey = refkey("context");
export const operationTypeBindingRefkey = refkey("operation-type-binding");
export const operationMetadataRefkey = refkey("operation-metadata");
export const operationParameterBindingRefkey = refkey("operation-parameter-binding");
export const operationResponseHeaderBindingRefkey = refkey("operation-response-header-binding");

export function operationParametersRefkey(operation: ServerOperation) {
  return refkey(operation, "parameters");
}

export function operationResponseRefkey(operation: ServerOperation) {
  return refkey(operation, "response");
}
