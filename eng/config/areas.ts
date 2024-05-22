import { type AreaLabels } from "./labels.js";

/**
 * Set the paths that each area applies to.
 */
export const AreaPaths: Record<keyof typeof AreaLabels, string[]> = {
  eng: ["eng/", ".github/"],
  "lib:azure-core": ["packages/typespec-azure-core/"],
  "lib:azure-resource-manager": ["packages/typespec-azure-resource-manager/"],
  "emitter:autorest": ["packages/typespec-azurerest/"],
};
