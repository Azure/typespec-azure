import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import { EmitContext, interpolatePath } from "@typespec/compiler";
import { AutorestEmitterOptions, getTracer } from "./lib.js";
import { ResolvedAutorestEmitterOptions, emitAllServiceAtAllVersions } from "./openapi.js";

const defaultOptions = {
  "output-file":
    "{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json",
  "new-line": "lf",
  "include-x-typespec-name": "never",
} as const;

export async function $onEmit(context: EmitContext<AutorestEmitterOptions>) {
  const resolvedOptions = { ...defaultOptions, ...context.options };
  const armTypesDir = interpolatePath(
    resolvedOptions["arm-types-dir"] ?? "{project-root}/../../common-types/resource-management",
    {
      "project-root": context.program.projectRoot,
      "emitter-output-dir": context.emitterOutputDir,
    }
  );
  const options: ResolvedAutorestEmitterOptions = {
    outputFile: resolvedOptions["output-file"],
    outputDir: context.emitterOutputDir,
    azureResourceProviderFolder: resolvedOptions["azure-resource-provider-folder"],
    examplesDirectory: resolvedOptions["examples-directory"],
    version: resolvedOptions["version"],
    newLine: resolvedOptions["new-line"],
    omitUnreachableTypes: resolvedOptions["omit-unreachable-types"],
    includeXTypeSpecName: resolvedOptions["include-x-typespec-name"],
    armTypesDir,
    useReadOnlyStatusSchema: resolvedOptions["use-read-only-status-schema"],
  };
  const tracer = getTracer(context.program);
  tracer.trace("options", JSON.stringify(options, null, 2));

  const tcgcSdkContext = createSdkContext(context, "@azure-tools/typespec-autorest");

  await emitAllServiceAtAllVersions(context.program, tcgcSdkContext, options);
}
