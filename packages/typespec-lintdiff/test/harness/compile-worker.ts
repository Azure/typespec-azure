// Worker script: compiles a single TypeSpec file and outputs diagnostics as JSON.
// Invoked as: node --import tsx/esm scripts/compile-worker.ts <mainTspPath> <outputDir> <ruleset> <enableLocalLinter>
// Where <ruleset> is "resource-manager", "data-plane", or "none"

import { compile, NodeHost, resolveCompilerOptions } from "@typespec/compiler";
import * as path from "path";

const [mainTspPath, outputDir, ruleset, enableLocalLinterArg] = process.argv.slice(2);
const enableLocalLinter = enableLocalLinterArg === "true";

const projectRoot = path.resolve(import.meta.dirname, "..");
const commonTypesRoot = process.env.LINTDIFF_COMMON_TYPES ?? path.join(projectRoot, "common-types");
const armTypesDir = path.join(commonTypesRoot, "resource-management");

const [resolvedOptions, configDiagnostics] = await resolveCompilerOptions(NodeHost, {
  entrypoint: path.resolve(mainTspPath),
  cwd: projectRoot,
});

const compileOptions: any = {
  ...resolvedOptions,
  outputDir: path.resolve(outputDir),
  emit: ["@azure-tools/typespec-autorest"],
  options: {
    ...(resolvedOptions.options ?? {}),
    "@azure-tools/typespec-autorest": {
      ...((resolvedOptions.options as any)?.["@azure-tools/typespec-autorest"] ?? {}),
      "output-file": "openapi.json",
      "azure-resource-provider-folder": ".",
      "arm-types-dir": armTypesDir,
    },
  },
};

const rulesetExtends = enableLocalLinter ? ["tsp-lintdiff-local-linter/all"] : [];

if (ruleset === "resource-manager") {
  compileOptions.linterRuleSet = {
    extends: [
      "@azure-tools/typespec-azure-rulesets/resource-manager",
      ...rulesetExtends,
    ],
  };
} else if (ruleset === "data-plane") {
  compileOptions.linterRuleSet = {
    extends: [
      "@azure-tools/typespec-azure-rulesets/data-plane",
      ...rulesetExtends,
    ],
  };
} else if (rulesetExtends.length > 0) {
  compileOptions.linterRuleSet = {
    extends: rulesetExtends,
  };
}

const program = await compile(
  NodeHost,
  path.resolve(mainTspPath),
  compileOptions,
);

const result = {
  diagnostics: [...configDiagnostics, ...program.diagnostics].map((d) => ({
    code: d.code,
    severity: d.severity === "error" ? "error" : "warning",
    message: d.message,
  })),
  hasErrors: [...configDiagnostics, ...program.diagnostics].some(
    (d) => d.severity === "error",
  ),
};

process.stdout.write(JSON.stringify(result));
