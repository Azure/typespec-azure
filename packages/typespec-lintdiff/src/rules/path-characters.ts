import { createRule } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

const recommendedPathPattern = new RegExp(
  "^(/([0-9A-Za-z._~-]+|{[^}]+}))*(/([0-9A-Za-z._~:-]+|{[^}]*}(:[0-9A-Za-z._~-]+)?))$",
);

export const pathCharactersRule = createRule({
  name: "path-characters",
  description: "Paths should contain only recommended characters.",
  severity: "warning",
  messages: {
    default: "Path contains non-recommended characters.",
  },
  create(context) {
    const reportedPaths = new Set<string>();

    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          recommendedPathPattern.test(httpOperation.path) ||
          reportedPaths.has(httpOperation.path)
        ) {
          return;
        }

        reportedPaths.add(httpOperation.path);
        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
