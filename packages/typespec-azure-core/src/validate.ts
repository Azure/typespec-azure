import type { Program } from "@typespec/compiler";
import { validateAzureAuthentication } from "./decorators/azure-authentication.js";
import { checkPreviewVersion } from "./decorators/preview-version.js";
import { checkEnsureVerb } from "./decorators/private/ensure-verb.js";
import { checkRpcRoutes } from "./decorators/private/needs-route.js";

export function $onValidate(program: Program) {
  validateAzureAuthentication(program);
  checkRpcRoutes(program);
  checkEnsureVerb(program);
  checkPreviewVersion(program);
}
