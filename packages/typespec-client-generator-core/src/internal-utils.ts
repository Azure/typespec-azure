import { Operation, Program, Type } from "@typespec/compiler";
import { SdkEnumType, SdkModelType } from "./interfaces.js";

export function parseEmitterName(emitterName?: string): string {
  if (!emitterName) {
    throw new Error("No emitter name found in program");
  }
  const regex = /.*(?:cadl|typespec)-([^\\/]*)/;
  const match = emitterName.match(regex);
  if (!match || match.length < 2) return "none";
  const language = match[1];
  if (["typescript", "ts"].includes(language)) return "javascript";
  return language;
}

export interface TCGCContext {
  program: Program;
  emitterName: string;
  generateProtocolMethods?: boolean;
  generateConvenienceMethods?: boolean;
  filterOutCoreModels?: boolean;
  packageName?: string;
  arm?: boolean;
  modelsMap?: Map<Type, SdkModelType | SdkEnumType>;
  operationModelsMap?: Map<Operation, Map<Type, SdkModelType | SdkEnumType>>;
  generatedNames?: Set<string>;
}

export function createTCGCContext(program: Program): TCGCContext {
  return {
    program,
    emitterName: "__TCGC_INTERNAL__",
  };
}
