import { Program } from "@typespec/compiler";
import { getAllModelsWithDiagnostics } from "./types.js";
import { createTCGCContext } from "./decorators.js";

export function $onValidate(program: Program) {
  // Pass along any diagnostics that might be returned from the HTTP library
  const tcgcContext = createTCGCContext(program, "@azure-tools/typespec-client-generator-core");
  const [_, diagnostics] = getAllModelsWithDiagnostics(tcgcContext);
  if (diagnostics.length > 0) {
    program.reportDiagnostics(diagnostics);
  }
}
