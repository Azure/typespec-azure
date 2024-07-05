import { Program, listServices, Model, Enum } from "@typespec/compiler";
import { createTCGCContext, TCGCContext } from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";
import { getClientNameOverride } from "./decorators.js";

export function $onValidate(program: Program) {
  // Pass along any diagnostics that might be returned from the HTTP library
  const tcgcContext = createTCGCContext(program);
  validateModels(program, tcgcContext);
}

function validateModels(program: Program, tcgcContext: TCGCContext) {
  const services = listServices(program);
  for (const service of services) {
    const modelNameMap = new Map<string, Set<Model | Enum>>();
    for(const model of service.type.models.values()){
      const clientName = getClientNameOverride(tcgcContext, model);
      const name = clientName ?? model.name;
      const existing = modelNameMap.get(name);
      if (existing) {
        existing.add(model);
      } else {
        modelNameMap.set(name, new Set([model]));
      }
    }

    for (const model of service.type.enums.values()) {
      const clientName = getClientNameOverride(tcgcContext, model);
      const name = clientName ?? model.name;
      const existing = modelNameMap.get(name);
      if (existing) {
        existing.add(model);
      } else {
        modelNameMap.set(name, new Set([model]));
      }
    }

    for (const [modelName, models] of modelNameMap) {
      if (models.size > 1) {
        for (const model of models) {
          reportDiagnostic(program, {
            code: "duplicate-model-name",
            format: { modelName },
            target: model,
          });
        }
      }
    }
  }
}
