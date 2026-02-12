// @ts-check
import { buildSamples_experimental } from "@typespec/playground/tooling";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

await buildSamples_experimental(packageRoot, resolve(__dirname, "dist/samples.ts"), {
  "Azure Resource Manager framework": {
    filename: "samples/arm.tsp",
    preferredEmitter: "@azure-tools/typespec-autorest",
    description:
      "Create Azure Resource Manager (ARM) management-plane APIs using the Azure Resource Manager framework ruleset.",
    compilerOptions: {
      linterRuleSet: { extends: ["@azure-tools/typespec-azure-rulesets/resource-manager"] },
    },
  },
  "Azure Core Data Plane Service": {
    filename: "samples/azure-core.tsp",
    preferredEmitter: "@azure-tools/typespec-autorest",
    description:
      "Model a data-plane service following Azure Core guidelines using the data-plane ruleset.",
    compilerOptions: {
      linterRuleSet: { extends: ["@azure-tools/typespec-azure-rulesets/data-plane"] },
    },
  },
});
