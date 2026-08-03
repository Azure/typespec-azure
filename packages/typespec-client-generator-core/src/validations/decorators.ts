import { NoTarget } from "@typespec/compiler";
import { TCGCContext } from "../interfaces.js";
import { reportDiagnostic } from "../lib.js";

const JAVA_CSHARP_ONLY_OPTIONS = ["generate-convenience-methods", "generate-protocol-methods"];
const JAVA_CSHARP_EMITTER_PATTERNS = ["java", "csharp"];

function isJavaOrCsharpEmitter(emitterName: string): boolean {
  const lower = emitterName.toLowerCase();
  return JAVA_CSHARP_EMITTER_PATTERNS.some((lang) => lower.includes(lang));
}

export function validateEmitterOptions(context: TCGCContext) {
  const emitterOptions = context.program.compilerOptions.options;
  if (!emitterOptions) return;

  for (const [emitterName, options] of Object.entries(emitterOptions)) {
    if (isJavaOrCsharpEmitter(emitterName)) continue;

    for (const optionName of JAVA_CSHARP_ONLY_OPTIONS) {
      if (optionName in options) {
        reportDiagnostic(context.program, {
          code: "unnecessary-emitter-option",
          format: {
            optionName,
            emitterName,
          },
          target: NoTarget,
        });
      }
    }
  }
}
