import { Program } from "@typespec/compiler";
import { createTCGCContext } from "./internal-utils.js";
import { getAllModelsWithDiagnostics } from "./types.js";
import { SdkModelType, SdkEnumType } from "./interfaces.js";
import { reportDiagnostic } from "./lib.js";

export function $onValidate(program: Program) {
  // Pass along any diagnostics that might be returned from the HTTP library
  const tcgcContext = createTCGCContext(program);
  const [models, diagnostics] = getAllModelsWithDiagnostics(tcgcContext);
  if (diagnostics.length > 0) {
    program.reportDiagnostics(diagnostics);
  }

  validateModels(program, models);
}

function validateModels(program: Program, models: (SdkModelType | SdkEnumType)[]) {
  const modelNameMap = new Map<string, Set<SdkModelType | SdkEnumType>>();
  for (const model of models) {
    const existing = modelNameMap.get(model.name);
    if (existing) {
      existing.add(model);
    } else {
      modelNameMap.set(model.name, new Set([model]));
    }
  }

  for (const [modelName, models] of modelNameMap) {
    if (models.size > 1) {
      for (const model of models) {
        if (model.__raw !== undefined) {
          reportDiagnostic(program, {
            code: "duplicate-model-name",
            format: { modelName },
            target: model.__raw,
          });
        }
      }
    }
  }
}
