import {
  createRule,
  fileRef,
  getNamespaceFullName,
  isTemplateDeclarationOrInstance,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { getHttpOperation, type HttpStatusCodeRange } from "@typespec/http";
import { getSingleNonNullMember } from "./model-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const useStandardErrorRule = createRule({
  name: "use-standard-error",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-error.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-error",
  description:
    "Operations must define an error response and use ErrorResponse from ARM common types for error payloads.",
  severity: "warning",
  messages: {
    default:
      "Error responses must have a body using `Azure.ResourceManager.CommonTypes.ErrorResponse` instead of a custom error payload.",
    missingErrorResponse:
      "Operations must define at least one default, 4xx, or 5xx error response.",
  },
  create(context) {
    const program = context.program;
    const reported = new Set<Operation | Operation["node"]>();

    return {
      operation(operation) {
        const source = operation.node ?? operation;
        if (
          reported.has(source) ||
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(program, operation);
        const errorResponses = httpOperation.responses.filter((response) =>
          isErrorResponse(response.statusCodes),
        );
        if (errorResponses.length === 0) {
          context.reportDiagnostic({ target: operation, messageId: "missingErrorResponse" });
          reported.add(source);
          return;
        }

        const invalidBody = errorResponses.some((response) =>
          response.responses.some(({ body }) =>
            body === undefined
              ? httpOperation.verb !== "head"
              : body.bodyKind !== "single" || !isStandardError(body.type),
          ),
        );
        if (invalidBody) {
          context.reportDiagnostic({ target: operation });
          reported.add(source);
        }
      },
    };
  },
});

function isStandardError(type: Type): boolean {
  if (type.kind === "Union") {
    const member = getSingleNonNullMember(type);
    return member !== undefined && isStandardError(member);
  }
  return (
    type.kind === "Model" &&
    type.name === "ErrorResponse" &&
    type.namespace !== undefined &&
    getNamespaceFullName(type.namespace) === "Azure.ResourceManager.CommonTypes"
  );
}

function isErrorResponse(status: number | "*" | HttpStatusCodeRange): boolean {
  return (
    status === "*" ||
    (typeof status === "number"
      ? status >= 400 && status < 600
      : status.start < 600 && status.end >= 400)
  );
}
