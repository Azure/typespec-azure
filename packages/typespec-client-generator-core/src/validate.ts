import { registerLroMarkerProvider } from "@azure-tools/typespec-azure-core";
import type { Program } from "@typespec/compiler";
import { createTCGCContext } from "./context.js";
import { getMarkAsLro } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { validateClients } from "./validations/clients.js";
import { validateHttp } from "./validations/http.js";
import { validateMethods } from "./validations/methods.js";
import { validatePackage } from "./validations/package.js";
import { validateTypes } from "./validations/types.js";

export function $onValidate(program: Program) {
  const markerContexts = new Map<string, TCGCContext>();
  registerLroMarkerProvider(program, (operation, emitterName) => {
    let context = markerContexts.get(emitterName);
    if (!context) {
      context = createTCGCContext(program, emitterName, { mutateNamespace: false });
      markerContexts.set(emitterName, context);
    }
    return getMarkAsLro(context, operation);
  });

  const tcgcContext = createTCGCContext(program, "@azure-tools/typespec-client-generator-core", {
    mutateNamespace: false,
  });
  validatePackage(tcgcContext);
  validateClients(tcgcContext);
  validateMethods(tcgcContext);
  validateHttp(tcgcContext);
  validateTypes(tcgcContext);
}
