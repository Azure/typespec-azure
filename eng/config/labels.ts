// cspell:ignore bfff

import { CommonLabels } from "../../core/eng/common/config/labels.js";
import { defineConfig, defineLabels } from "../../core/eng/common/scripts/labels/config.js";

/**
 * Labels that are used to categorize issue for which area they belong to.
 */
export const AreaLabels = defineLabels({
  "lib:tcgc": {
    color: "957300",
    description: "Issues for @azure-tools/typespec-client-generator-core library",
  },
  "lib:azure-core": {
    color: "957300",
    description: "Issues for @azure-tools/typespec-azure-core library",
  },
  "lib:azure-resource-manager": {
    color: "957300",
    description: "Issues for @azure-tools/typespec-azure-core library",
  },
  "lib:azure-http-specs": {
    color: "c7aee6",
    description: "For issues/prs related to the @azure-tools/typespec-azure-http-specs package",
  },
  "emitter:autorest": {
    color: "957300",
    description: "Issues for @azure-tools/typespec-autorest emitter",
  },
  eng: {
    color: "65bfff",
    description: "",
  },
  ide: {
    color: "846da1",
    description: "Issues for Azure specific ide features",
  },
  "cli/psh": {
    color: "9EB120",
    description: "Issues for Azure CLI/PSH features",
  },
});

/**
 * Set the paths that each area applies to.
 */
export const AreaPaths: Record<keyof typeof AreaLabels, string[]> = {
  eng: ["eng/", ".github/"],
  "lib:azure-core": ["packages/typespec-azure-core/"],
  "lib:azure-resource-manager": ["packages/typespec-azure-resource-manager/"],
  "emitter:autorest": ["packages/typespec-autorest/"],
  "lib:tcgc": ["packages/typespec-client-generator-core/"],
  "lib:azure-http-specs": ["packages/typespec-azure-http-specs/"],
  ide: [],
  "cli/psh": [],
};

export default defineConfig({
  repo: {
    owner: "Azure",
    repo: "typespec-azure",
  },
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
    external: {
      description: "External tools",
      labels: {
        "external:swagger-converter": {
          color: "7057ff",
          description: "Issues related to the swagger-converter tool",
        },
        "external:mgmt": {
          color: "7057ff",
          description: "",
        },
      },
    },
  },
});
