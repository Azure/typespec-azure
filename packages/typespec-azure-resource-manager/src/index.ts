export const namespace = "Azure.ResourceManager";

export type { ArmFeatureOptions } from "../generated-defs/Azure.ResourceManager.js";
export {
  $armCommonTypesVersion,
  getArmCommonTypeOpenAPIRef,
  getArmCommonTypesVersion,
  getArmCommonTypesVersions,
  getExternalTypeRef,
  isArmCommonType,
  type ArmCommonTypeVersions,
  type ArmCommonTypesResolutionOptions,
} from "./common-types.js";

export * from "./namespace.js";
export * from "./operations.js";
export * from "./resource.js";

export { $lib } from "./lib.js";
export { $linter } from "./linter.js";

export { getAzureBaseTypes, setAzureBaseTypes, type AzureBaseTypeInfo } from "./base-types.js";
export { getInlineAzureType } from "./commontypes.private.decorators.js";
export { isAzureResource } from "./private.decorators.js";

/** @internal */
export { $decorators } from "./tsp-index.js";
