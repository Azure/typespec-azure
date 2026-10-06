import { emitFile, NoTarget, resolvePath, type EmitContext } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { buildServerModel } from "./build-model.js";
import { reportDiagnostic } from "./lib.js";
import type { AzuritePilotEmitterOptions } from "./options.js";
import { normalizeOptions } from "./options.js";
import { renderHandlers, renderModels, renderOperations } from "./render/index.js";

/**
 * Emitter entry point: builds the intermediate server model (transform phase) and renders
 * it into the three generated artifacts (render phase).
 */
export async function $onEmit(context: EmitContext<AzuritePilotEmitterOptions>): Promise<void> {
  const options = normalizeOptions(context.options);
  const { program } = context;

  const [services] = getAllHttpServices(program);
  if (services.length === 0) {
    reportDiagnostic(program, { code: "no-service-found", target: NoTarget });
  }

  const serverModel = buildServerModel(program);

  const baseDir = resolvePath(context.emitterOutputDir, options.outputDir);

  await emitFile(program, {
    path: resolvePath(baseDir, "models.ts"),
    content: renderModels(serverModel),
  });
  await emitFile(program, {
    path: resolvePath(baseDir, "operations.ts"),
    content: renderOperations(serverModel),
  });
  await emitFile(program, {
    path: resolvePath(baseDir, "handlers.ts"),
    content: renderHandlers(serverModel),
  });
}
