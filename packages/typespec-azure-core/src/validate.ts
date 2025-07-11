import { Program } from "@typespec/compiler";
import { checkEnsureVerb, checkPreviewVersion, checkRpcRoutes } from "./decorators.js";

export function $onValidate(program: Program) {
  checkRpcRoutes(program);
  checkEnsureVerb(program);
  checkPreviewVersion(program);
}
