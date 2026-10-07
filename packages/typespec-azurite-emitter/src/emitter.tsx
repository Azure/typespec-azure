import { renderAsync, type Children, type OutputDirectory } from "@alloy-js/core";
import {
  emitFile,
  NoTarget,
  resolvePath,
  type EmitContext,
  type Program,
} from "@typespec/compiler";
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

  const [services] = getAllHttpServices(program);
  if (services.length === 0) {
    reportDiagnostic(program, { code: "no-service-found", target: NoTarget });
  }

  const serverModel = buildServerModel(program);

  const baseDir = resolvePath(context.emitterOutputDir, options.outputDir);
  await writeOutput(
    program,
    <AzuriteEmitterOutput serverModel={serverModel} program={program} />,
    baseDir,
  );
}

async function writeOutput(program: Program, rootComponent: Children, emitterOutputDir: string) {
  const tree = await renderAsync(rootComponent);
  await writeOutputDirectory(program, tree, emitterOutputDir);
}

async function writeOutputDirectory(
  program: Program,
  dir: OutputDirectory,
  emitterOutputDir: string,
) {
  for (const sub of dir.contents) {
    if ("contents" in sub) {
      if (Array.isArray(sub.contents)) {
        await writeOutputDirectory(program, sub as OutputDirectory, emitterOutputDir);
      } else {
        await emitFile(program, {
          content: sub.contents as string,
          path: resolvePath(emitterOutputDir, sub.path),
        });
      }
    }
  }
}
