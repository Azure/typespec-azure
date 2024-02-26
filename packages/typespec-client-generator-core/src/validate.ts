import { Program } from "@typespec/compiler";
import { createTCGCContext } from "./internal-utils.js";
import { getAllModelsWithDiagnostics } from "./types.js";

export function $onValidate(program: Program) {
  // Pass along any diagnostics that might be returned from the HTTP library
  const tcgcContext = createTCGCContext(program);
  const [_, diagnostics] = getAllModelsWithDiagnostics(tcgcContext);
  if (diagnostics.length > 0) {
    program.reportDiagnostics(diagnostics);
  }
}
