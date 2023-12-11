import { Program } from "@typespec/compiler";
import { checkEnsureVerb, checkRpcRoutes } from "./decorators.js";

export function $onValidate(program: Program) {
  checkRpcRoutes(program);
  checkEnsureVerb(program);
}
