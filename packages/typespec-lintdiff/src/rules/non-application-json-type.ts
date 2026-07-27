import { createRule } from "@typespec/compiler";
import type { ModelProperty, Operation } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import type { HttpPayloadBody } from "@typespec/http";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";

export const nonApplicationJsonTypeRule = createRule({
  name: "non-application-json-type",
  description:
    "ARM operations must only use application/json content types in request and response bodies.",
  severity: "warning",
  messages: {
    default: "Only content-type 'application/json' is supported by ARM",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);

        reportInvalidBody(context, operation, httpOperation.parameters.body);

        for (const response of httpOperation.responses) {
          for (const content of response.responses) {
            reportInvalidBody(context, operation, content.body);
          }
        }
      },
    };
  },
});

function reportInvalidBody(
  context: Parameters<typeof nonApplicationJsonTypeRule.create>[0],
  operation: Operation,
  body: HttpPayloadBody | undefined,
): void {
  if (body === undefined) {
    return;
  }

  for (const contentType of body.contentTypes) {
    if (contentType.includes("application/json")) {
      continue;
    }

    context.reportDiagnostic({
      target: getDiagnosticTarget(operation, body),
    });
  }
}

function getDiagnosticTarget(
  operation: Operation,
  body: HttpPayloadBody,
): ModelProperty | Operation {
  if (body.contentTypeProperty !== undefined) {
    return body.contentTypeProperty;
  }

  if ("property" in body && body.property !== undefined) {
    return body.property;
  }

  return operation;
}
