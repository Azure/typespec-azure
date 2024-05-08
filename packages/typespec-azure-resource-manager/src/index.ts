import { definePackageFlags } from "@typespec/compiler";

export const namespace = "Azure.ResourceManager";

export * from "./common-types.js";
export * from "./namespace.js";
export * from "./operations.js";
export * from "./resource.js";

export { $lib } from "./lib.js";
export { $linter } from "./linter.js";

export const $flags = definePackageFlags({
  decoratorArgMarshalling: "new",
});
