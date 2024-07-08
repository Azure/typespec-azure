import { definePackageFlags } from "@typespec/compiler";

export const namespace = "Azure.ResourceManager";

export {
  $armCommonTypesVersion,
  getArmCommonTypeOpenAPIRef,
  getArmCommonTypesVersion,
  getArmCommonTypesVersions,
  isArmCommonType,
  type ArmCommonTypeVersions,
  type ArmCommonTypesResolutionOptions,
} from "./common-types.js";

export { isAzureResource } from "./private.decorators.js";

export * from "./namespace.js";
export * from "./operations.js";
export * from "./resource.js";

export { $lib } from "./lib.js";
export { $linter } from "./linter.js";

export const $flags = definePackageFlags({
  decoratorArgMarshalling: "new",
});
