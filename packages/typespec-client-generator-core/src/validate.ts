import { Program, listServices, Model, Enum } from "@typespec/compiler";
import { DuplicateTracker } from "@typespec/compiler/utils";
import { createTCGCContext, TCGCContext } from "./internal-utils.js";
import { reportDiagnostic,  } from "./lib.js";
import { getClientNameOverride } from "./decorators.js";

export function $onValidate(program: Program) {
  const tcgcContext = createTCGCContext(program);
  validateModels(program, tcgcContext);
}

function validateModels(program: Program, tcgcContext: TCGCContext) {
  const services = listServices(program);
  for (const service of services) {
    const duplicateTracker = new DuplicateTracker<string, Model | Enum>();
    for(const model of [...service.type.models.values(), ...service.type.enums.values()]){
      const clientName = getClientNameOverride(tcgcContext, model);
      const name = clientName ?? model.name;
      duplicateTracker.track(name, model);
    }

    for (const [modelName, duplicates] of duplicateTracker.entries()) {
      for (const model of duplicates) {
        reportDiagnostic(program, {
          code: "duplicate-model-name",
          format: { modelName },
          target: model,
        });
      }
    }
  }
}
