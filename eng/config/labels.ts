// cspell:ignore bfff

import { CommonLabels } from "../../core/eng/common/config/labels.js";
import { defineConfig, defineLabels } from "../../core/eng/common/scripts/labels/config.js";

/**
 * Labels that are used to categorize issue for which area they belong to.
 */
export const AreaLabels = defineLabels({
  "lib:azure-core": {
    color: "957300",
    description: "Issues for @azure-tools/typespec-azure-core library",
  },
  "lib:azure-resource-manager": {
    color: "957300",
    description: "Issues for @azure-tools/typespec-azure-core library",
  },

  "emitter:autorest": {
    color: "957300",
    description: "Issues for @azure-tools/typespec-autorest emitter",
  },
  eng: {
    color: "65bfff",
    description: "",
  },
});

/**
 * Set the paths that each area applies to.
 */
export const AreaPaths: Record<keyof typeof AreaLabels, string[]> = {
  eng: ["eng/", ".github/"],
  "lib:azure-core": ["packages/typespec-azure-core/"],
  "lib:azure-resource-manager": ["packages/typespec-azure-resource-manager/"],
  "emitter:autorest": ["packages/typespec-azurerest/"],
};

export default defineConfig({
  repo: {
    owner: "Azure",
    repo: "typespec-azure",
  },
  areaLabels: AreaLabels,
  areaPaths: AreaPaths,
  labels: {
    area: {
      description: "Area of the codebase",
      labels: AreaLabels,
    },
    ...CommonLabels,
    misc: {
      description: "Misc labels",
      labels: {
        "good first issue": {
          color: "7057ff",
          description: "Good for newcomers",
        },
      },
    },
  },
});
