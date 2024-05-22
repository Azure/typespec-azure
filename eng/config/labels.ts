// cspell:ignore bfff

import { CommonLabels } from "../../core/eng/common/config/labels.js";

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

export default {
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
} as const;

export function defineLabels<const T extends string>(
  labels: Record<T, { color: string; description: string }>
) {
  return labels;
}
