import { createStateSymbol } from "./lib.js";

export const PortalCoreKeys = {
  browse: createStateSymbol("browse"),
  about: createStateSymbol("about"),
  marketplaceOffer: createStateSymbol("marketplaceOffer"),
  displayName: createStateSymbol("displayName"),
  // essentials: createStateSymbol("essentials"),
  // patternValidationMessage: createStateSymbol("patternValidationMessage")
};
