import { createRule, paramMessage } from "@typespec/compiler";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

const canonicalSegments = ["resourceGroups", "subscriptions"] as const;

export const subscriptionsAndResourceGroupCasingRule = createRule({
  name: "subscriptions-and-resource-group-casing",
  description:
    "ARM paths must use the canonical subscriptions and resourceGroups segment casing.",
  severity: "warning",
  messages: {
    default:
      paramMessage`The path segment ${"actual"} should be ${"expected"}.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!isArmProviderNamespace(context.program, namespace)) {
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

  for (const segment of canonicalSegments) {
    const index = path.toLowerCase().indexOf(`/${segment.toLowerCase()}`);
    if (index === -1) {
      continue;
    }

    const actual = path.substring(index + 1, index + segment.length + 1);
    if (actual === segment) {
      continue;
    }

    mismatches.push({
      actual,
      expected: segment,
    });
  }

  return mismatches;
}
