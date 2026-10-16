import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

const canonicalSegments = ["resourceGroups", "subscriptions"] as const;

export const scopePathSegmentCasingRule = createRule({
  name: "scope-path-segment-casing",
  docs: fileRef.fromPackageRoot("src/rules/scope-path-segment-casing.md"),
  severity: "warning",
  description: "ARM paths must use the canonical subscriptions and resourceGroups segment casing.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/scope-path-segment-casing",
  messages: {
    default: paramMessage`The path segment ${"actual"} should be ${"expected"}.`,
  },
  create(context) {
    return {
      operation: (operation) => {
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
