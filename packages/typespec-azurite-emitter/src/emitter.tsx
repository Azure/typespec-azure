import { NoTarget, resolvePath, type EmitContext } from "@typespec/compiler";
import { writeOutput } from "@typespec/emitter-framework";
import { getAllHttpServices } from "@typespec/http";
import { buildServerModel } from "./build-model.js";
import { createAzuriteEmitterContext } from "./context.js";
import { reportDiagnostic } from "./lib.js";
import type { AzuriteEmitterOptions } from "./options.js";
import { normalizeOptions } from "./options.js";
import { AzuriteEmitterOutput } from "./render/index.js";

/**
 * Emitter entry point: builds the intermediate server model (transform phase) and renders
 * it into the generated artifacts (render phase).
 */
export async function $onEmit(context: EmitContext<AzuriteEmitterOptions>): Promise<void> {
  const options = normalizeOptions(context.options);
  const azuriteContext = createAzuriteEmitterContext(context.program, options);
  const { program } = azuriteContext;

  const [services, httpDiagnostics] = getAllHttpServices(program);
  // @typespec/http reports these diagnostics during validation.
  if (httpDiagnostics.some((diagnostic) => diagnostic.severity === "error")) return;
  if (services.length === 0) {
    reportDiagnostic(program, { code: "no-service-found", target: NoTarget });
    return;
  }
  if (services.length > 1) {
    reportDiagnostic(program, { code: "multiple-services", target: NoTarget });
    return;
  }
  if (services[0].operations.length === 0) {
    reportDiagnostic(program, { code: "no-operations", target: services[0].namespace });
    return;
  }

  const serverModel = buildServerModel(azuriteContext, services[0]);
  if (azuriteContext.diagnostics.length > 0) {
    program.reportDiagnostics(azuriteContext.diagnostics);
    return;
  }

  const baseDir = resolvePath(context.emitterOutputDir, options.outputDir);
  await writeOutput(
    program,
    <AzuriteEmitterOutput serverModel={serverModel} context={azuriteContext} />,
    baseDir,
  );
}
