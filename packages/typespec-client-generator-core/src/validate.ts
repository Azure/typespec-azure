import { Program } from "@typespec/compiler";
import { createTCGCContext } from "./context.js";
import { validateClients } from "./validations/clients.js";
import { validateHttp } from "./validations/http.js";
import { validateMethods } from "./validations/methods.js";
import { validatePackage } from "./validations/package.js";

export function $onValidate(program: Program) {
  const tcgcContext = createTCGCContext(program, "@azure-tools/typespec-client-generator-core", {
    mutateNamespace: false,
  });

  validatePackage(tcgcContext);
  validateClients(tcgcContext);
  validateMethods(tcgcContext);
  validateHttp(tcgcContext);
  // Note: Type name validation (validateTypes) is now done in createSdkContext
  // where we have access to emitter options/flags
}
