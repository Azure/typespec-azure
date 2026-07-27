import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { resolveOperationId } from "@typespec/openapi";

export const postOperationIdContainsUrlVerbRule = createRule({
  name: "post-operation-id-contains-url-verb",
  description:
    "POST action operations should include the action verb from the route path in the operation name.",
  severity: "warning",
  messages: {
    default: paramMessage`POST operation '${"operationName"}' should contain the action verb '${"urlVerb"}' from the route path. Consider updating the operation name.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "post") {
          return;
        }

        const urlVerb = extractActionVerb(httpOperation.path);
        if (urlVerb === undefined) {
          return;
        }

        // TypeSpec-first: check the operation name
        const opName = operation.name.toLowerCase();
        if (!opName.includes(urlVerb)) {
          context.reportDiagnostic({
            target: operation,
            format: {
              operationName: operation.name,
              urlVerb,
            },
          });
          return;
        }

        // Corner case: also check if @operationId override is used
        // and the override doesn't contain the URL verb
        const resolvedId = resolveOperationId(context.program, operation);
        const verbPart = resolvedId.includes("_")
          ? resolvedId.split("_").pop()!.toLowerCase()
          : resolvedId.toLowerCase();
        if (verbPart !== opName && !verbPart.includes(urlVerb)) {
          context.reportDiagnostic({
            target: operation,
            format: {
              operationName: resolvedId,
              urlVerb,
            },
          });
        }
      },
    };
  },
});

function extractActionVerb(path: string): string | undefined {
  const segments = path.split("/").filter((s) => s.length > 0 && !s.startsWith("{"));
  if (segments.length === 0) {
    return undefined;
  }
  const lastSegment = segments[segments.length - 1].toLowerCase();
  // Skip provider namespace segments and resource type segments
  if (lastSegment === "providers" || lastSegment.includes(".")) {
    return undefined;
  }
  return lastSegment;
}
