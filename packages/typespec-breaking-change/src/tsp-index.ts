import { $approvedBreakingChange, $approvedUnversionedChange } from "./decorators.js";

export { $approvedBreakingChange, $approvedUnversionedChange } from "./decorators.js";
export { $lib } from "./lib.js";

/** @internal */
export const $decorators = {
  "@azure-tools/typespec-breaking-change": {
    approvedBreakingChange: $approvedBreakingChange,
    approvedUnversionedChange: $approvedUnversionedChange,
  },
};
