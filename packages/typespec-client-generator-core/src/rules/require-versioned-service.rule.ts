import { createRule, getNamespaceFullName, Namespace, paramMessage } from "@typespec/compiler";
import { getVersions } from "@typespec/versioning";
import { createTCGCContext } from "../context.js";
import { getAdditionalApiVersions } from "../decorators.js";

export const requireVersionedServiceRule = createRule({
  name: "require-versioned-service",
  description: "Require a versioned service to use this decorator",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/require-versioned-service",
  messages: {
    default: paramMessage`Service "${"serviceName"}" must be versioned if you want to apply the "${"decoratorName"}" decorator`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
    );
    return {
      namespace: (namespace: Namespace) => {
        const versions = getVersions(context.program, namespace)[1];
        if (versions === undefined && getAdditionalApiVersions(tcgcContext, namespace)) {
          context.reportDiagnostic({
            target: namespace,
            format: {
              serviceName: getNamespaceFullName(namespace),
              decoratorName: "@additionalApiVersions",
            },
          });
        }
      },
    };
  },
});
