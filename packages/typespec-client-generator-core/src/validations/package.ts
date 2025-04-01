import { getNamespaceFullName } from "@typespec/compiler";
import { getVersions } from "@typespec/versioning";
import { getAdditionalApiVersions } from "../decorators.js";
import { TCGCContext } from "../interfaces.js";
import { listAllNamespaces } from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validatePackage(context: TCGCContext) {
  validateDecoratorsAppliedToVersionedService(context);
}

function validateDecoratorsAppliedToVersionedService(tcgcContext: TCGCContext) {
  for (const namespace of listAllNamespaces(tcgcContext, tcgcContext.getMutatedGlobalNamespace())) {
    const versions = getVersions(tcgcContext.program, namespace)[1];
    if (versions === undefined && getAdditionalApiVersions(tcgcContext, namespace)) {
      reportDiagnostic(tcgcContext.program, {
        code: "require-versioned-service",
        format: {
          serviceName: getNamespaceFullName(namespace),
          decoratorName: "@additionalApiVersions",
        },
        target: namespace,
      });
    }
  }
}
