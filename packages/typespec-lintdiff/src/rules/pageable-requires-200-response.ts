import { createRule } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

export const pageableRequires200ResponseRule = createRule({
  name: "pageable-requires-200-response",
  description: "Operations with x-ms-pageable must declare a 200 response.",
  severity: "warning",
  messages: {
    default: "A 200 response must be defined when using the x-ms-pageable extension.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (!getExtensions(context.program, operation).has("x-ms-pageable")) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        const has200Response = httpOperation.responses.some(
          (response) => response.statusCodes === 200,
        );

        if (!has200Response) {
          context.reportDiagnostic({
            target: operation,
          });
        }
      },
    };
  },
});
