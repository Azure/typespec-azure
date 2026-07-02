import { createTypeSpecLibrary, defineLinter } from "@typespec/compiler";
import clientSdkRuleset from "./rulesets/client-sdk.js";
import dataPlaneRuleset from "./rulesets/data-plane.js";
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
    "client-sdk": clientSdkRuleset,
  },
});
