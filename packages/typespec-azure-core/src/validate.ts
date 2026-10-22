import type { Program } from "@typespec/compiler";
import { checkPreviewVersion } from "./decorators/preview-version.js";
import { checkEnsureVerb } from "./decorators/private/ensure-verb.js";
import { checkRpcRoutes } from "./decorators/private/needs-route.js";

export function $onValidate(program: Program) {
  checkRpcRoutes(program);
  checkEnsureVerb(program);
  checkPreviewVersion(program);
}
