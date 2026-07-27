import { createRule, paramMessage } from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

const versionSegmentPattern = /^v[0-9]+(?:\.[0-9]+)?$/i;

export const versionPolicyRule = createRule({
  name: "version-policy",
  description:
    'Data-plane operations must use a required "api-version" query parameter and must not encode versions in the path.',
  severity: "warning",
  messages: {
    path:
      paramMessage`Version segment "${"version"}" in path violates Azure versioning policy.`,
    required: '"api-version" should be a required parameter',
  },
  create(context) {
    const reportedPaths = new Set<string>();

    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) !== undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);

        const versionSegment = getVersionSegment(httpOperation.path);
        if (versionSegment && !reportedPaths.has(httpOperation.path)) {
          reportedPaths.add(httpOperation.path);
          context.reportDiagnostic({
            target: operation,
            messageId: "path",
            format: {
              version: versionSegment,
            },
          });
        }

        for (const parameter of httpOperation.parameters.parameters) {
          if (
            parameter.type !== "query" ||
            parameter.name.toLowerCase() !== "api-version" ||
            !parameter.param.optional
          ) {
            continue;
          }

          context.reportDiagnostic({
            target: parameter.param,
            messageId: "required",
          });
        }
      },
    };
  },
});

function getVersionSegment(path: string): string | undefined {
  const segments = path.split("/");
  return segments.find((segment) => versionSegmentPattern.test(segment));
}
