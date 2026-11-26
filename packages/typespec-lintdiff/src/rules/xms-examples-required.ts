import { getExamples } from "@azure-tools/typespec-autorest";
import { createRule } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

const supportedVerbs = new Set(["delete", "get", "head", "options", "patch", "post", "put"]);

export const xmsExamplesRequiredRule = createRule({
  name: "xms-examples-required",
  description: "Operations should define the x-ms-examples OpenAPI extension.",
  severity: "warning",
  messages: {
    default:
      "Please provide x-ms-examples describing minimum/maximum property set for response/request payloads for operations.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (!supportedVerbs.has(httpOperation.verb)) {
          return;
        }

        if (getExtensions(context.program, operation).has("x-ms-examples")) {
          return;
        }

        if (getExamples(context.program, operation)?.length) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
