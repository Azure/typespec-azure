import { emitFile, joinPaths, NoTarget, type EmitContext } from "@typespec/compiler";
import { CodeModelBuilder, type EmitterOptionsDev } from "../src/code-model-builder.js";
import type { CodeModel } from "../src/common/code-model.js";
import { reportDiagnostic } from "../src/lib.js";
import type { EmitterOptions } from "../src/options.js";
import { DiagnosticError } from "../src/utils.js";

export async function $onEmit(context: EmitContext<EmitterOptions>) {
  const { program } = context;
  if (program.compilerOptions.noEmit || program.hasError()) return;

  try {
    if (context.options["customization-class"] || context.options["partial-update"]) {
      throw new Error("The TeaVM POC does not support customization or partial updates.");
    }
    const options: EmitterOptionsDev = {
      ...context.options,
      flavor: "azure",
      "output-dir": "/output",
      "generate-samples": false,
      "generate-tests": false,
    };
    const model = await new CodeModelBuilder(program, { ...context, options }).build();
    if (!model || program.hasError()) return;
    if (model.arm) {
      throw new Error("The TeaVM POC supports Azure data-plane clients only.");
    }
    const files = await generate(model, {
      ...options,
      arm: false,
      "include-api-view-properties": false,
      "license-header": model.info?.license?.extensions?.header,
    });
    for (const [path, content] of Object.entries(files)) {
      await emitFile(program, { path: joinPaths(context.emitterOutputDir, path), content });
    }
  } catch (error) {
    if (error instanceof DiagnosticError) {
      program.reportDiagnostic(error.diagnostic);
    } else {
      reportDiagnostic(program, {
        code: "generator-error",
        target: NoTarget,
        format: { errorMessage: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}

function generate(model: CodeModel, options: Record<string, unknown>) {
  return new Promise<Record<string, string>>((resolve, reject) => {
    // A fresh worker isolates the generator's JVM-process-scoped settings and mapper caches.
    const worker = new Worker(new URL("./java-wasm/worker.js", import.meta.url), {
      type: "module",
    });
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    const timeout = setTimeout(() => {
      finish();
      reject(new Error("Java WASM generation timed out."));
    }, 90_000);
    worker.onmessage = (
      event: MessageEvent<{ files?: Record<string, string>; error?: string }>,
    ) => {
      finish();
      if (event.data.files) resolve(event.data.files);
      else reject(new Error(event.data.error ?? "Java WASM generation failed."));
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Failed to load the Java WASM worker."));
    };
    try {
      worker.postMessage({ model, options: JSON.stringify(options) });
    } catch (error) {
      finish();
      reject(error);
    }
  });
}
