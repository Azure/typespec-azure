import { $approvedBreakingChange, $approvedUnversionedChange } from "./suppression/decorators.js";

export { $lib } from "./lib.js";

/** @internal */
export const $decorators = {
  "Azure.BreakingChange": {
    approvedBreakingChange: $approvedBreakingChange,
    approvedUnversionedChange: $approvedUnversionedChange,
  },
};
