import { createTypeSpecLibrary, defineLinter } from "@typespec/compiler";
import dataPlaneRuleset from "./rulesets/data-plane.js";
import resourceManagerSuppressionRequiredRuleset from "./rulesets/resource-manager-suppression-required.js";
import resourceManagerRuleset from "./rulesets/resource-manager.js";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azure-rulesets",
  diagnostics: {},
});

export const $linter = defineLinter({
  rules: [],
  ruleSets: {
    "data-plane": dataPlaneRuleset,
    "resource-manager": resourceManagerRuleset,
    "resource-manager-suppression-required": resourceManagerSuppressionRequiredRuleset,
  },
});
