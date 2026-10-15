import {
  createRule,
  fileRef,
  getLocationContext,
  type Interface,
  type ModelProperty,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getHttpOperation, type HttpPayloadBody } from "@typespec/http";
import { isArmProviderNamespace } from "../namespace.js";

export const useApplicationJsonContentTypeRule = createRule({
  name: "use-application-json-content-type",
  docs: fileRef.fromPackageRoot("src/rules/use-application-json-content-type.md"),
  description:
    "ARM operations must only use application/json content types in request and response bodies.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-application-json-content-type",
  severity: "warning",
  messages: {
    default: "Only content-type 'application/json' is supported by ARM.",
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
  context: Parameters<typeof useApplicationJsonContentTypeRule.create>[0],
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
      target: getDiagnosticTarget(context.program, operation, body),
    });
  }
}

function getDiagnosticTarget(
  program: Program,
  operation: Operation,
  body: HttpPayloadBody,
): Interface | ModelProperty | Operation {
  if (
    body.contentTypeProperty !== undefined &&
    getLocationContext(program, body.contentTypeProperty).type === "project"
  ) {
    return body.contentTypeProperty;
  }

  if (
    "property" in body &&
    body.property !== undefined &&
    getLocationContext(program, body.property).type === "project"
  ) {
    return body.property;
  }

  if (getLocationContext(program, operation).type === "project") {
    return operation;
  }

  return operation.interface ?? operation;
}
