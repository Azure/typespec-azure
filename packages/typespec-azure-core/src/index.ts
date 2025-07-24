export const namespace = "Azure.Core";

export { $lib } from "./lib.js";
export { $linter } from "./linter.js";

export * from "./decorators.js";
export { extractLroStates } from "./decorators/lro-status.js";
export { UnionEnum, getUnionAsEnum } from "./helpers/union-enums.js";
export * from "./lro-helpers.js";
export * from "./rules/no-legacy-usage.js";
export * from "./rules/prevent-rest-library.js";
export * from "./rules/use-standard-operations.js";
export * from "./traits.js";
export * from "./utils.js";

/** @internal */
export { $decorators } from "./tsp-index.js";
