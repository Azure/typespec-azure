import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

const canonicalSegments = ["resourceGroups", "subscriptions"] as const;

export const subscriptionsAndResourceGroupCasingRule = createRule({
  name: "subscriptions-and-resource-group-casing",
  description: "ARM paths must use the canonical subscriptions and resourceGroups segment casing.",
  severity: "warning",
  messages: {
    default: paramMessage`The path segment ${"actual"} should be ${"expected"}.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        let namespace = operation.interface?.namespace ?? operation.namespace;
        while (namespace && !isArmProviderNamespace(context.program, namespace)) {
          namespace = namespace.namespace;
        }
        if (!namespace) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        for (const mismatch of getSegmentCasingMismatches(httpOperation.path)) {
          context.reportDiagnostic({
            target: operation,
            format: mismatch,
          });
        }
      },
    };
  },
});

function getSegmentCasingMismatches(path: string): { actual: string; expected: string }[] {
  const mismatches: { actual: string; expected: string }[] = [];

  for (const actual of path.split("/")) {
    const expected = canonicalSegments.find(
      (segment) => segment.toLowerCase() === actual.toLowerCase(),
    );
    if (expected && actual !== expected) {
      mismatches.push({ actual, expected });
    }
  }

  return mismatches;
}
