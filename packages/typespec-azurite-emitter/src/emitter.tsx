import { NoTarget, resolvePath, type EmitContext } from "@typespec/compiler";
import { writeOutput } from "@typespec/emitter-framework";
import { getAllHttpServices } from "@typespec/http";
import { buildServerModel } from "./build-model.js";
import { reportDiagnostic } from "./lib.js";
import type { AzuritePilotEmitterOptions } from "./options.js";
import { normalizeOptions } from "./options.js";
import { AzuriteEmitterOutput } from "./render/index.js";

/**
 * Emitter entry point: builds the intermediate server model (transform phase) and renders
 * it into the three generated artifacts (render phase).
 */
export async function $onEmit(context: EmitContext<AzuritePilotEmitterOptions>): Promise<void> {
  const options = normalizeOptions(context.options);
  const { program } = context;

  const [services, httpDiagnostics] = getAllHttpServices(program);
  if (httpDiagnostics.length > 0) {
    program.reportDiagnostics(httpDiagnostics);
    return;
  }
  if (services.length === 0 || services[0].operations.length === 0) {
    reportDiagnostic(program, { code: "no-service-found", target: NoTarget });
    return;
  }
  if (services.length > 1) {
    reportDiagnostic(program, { code: "multiple-services", target: NoTarget });
    return;
  }

  const serverModel = buildServerModel(program, services[0]);
  if (serverModel.skippedOperations.length > 0) {
    for (const skipped of serverModel.skippedOperations) {
      reportDiagnostic(program, {
        code: "skipped-operation",
        format: { name: skipped.name, reason: skipped.reason },
        target: skipped.target,
      });
    }
    return;
  }

  const baseDir = resolvePath(context.emitterOutputDir, options.outputDir);
  await writeOutput(
    program,
    <AzuriteEmitterOutput
      serverModel={serverModel}
      program={program}
      runtimeImport={options.runtimeImport}
    />,
    baseDir,
  );
}
