import { Program } from "@typespec/compiler";
import { checkEnsureVerb, checkRpcRoutes } from "./decorators.js";
import { checkPreviewVersion } from "./decorators/preview-version.js";

export function $onValidate(program: Program) {
  checkRpcRoutes(program);
  checkEnsureVerb(program);
  checkPreviewVersion(program);
}
