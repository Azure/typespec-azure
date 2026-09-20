import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createRule,
  fileRef,
  getNamespaceFullName,
  isNullType,
  isTemplateDeclarationOrInstance,
  type Operation,
  type Type,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpOperation,
  Visibility,
  type HttpStatusCodeRange,
} from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const useStandardLroErrorRule = createRule({
  name: "use-standard-lro-error",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-lro-error.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-lro-error",
  description:
    "Long-running operations must define an error response and use ErrorResponse from ARM common types for error payloads.",
  severity: "warning",
  messages: {
    default:
      "Error payloads of long-running operations must use `Azure.ResourceManager.CommonTypes.ErrorResponse` instead of a custom error payload.",
    missingErrorResponse:
      "Long-running operations must define at least one default, 4xx, or 5xx error response.",
  },
  create(context) {
    const program = context.program;
    const metadata = createMetadataInfo(program, { canonicalVisibility: Visibility.Read });
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
        if (httpOperation.verb === "get" || getLroMetadata(program, operation) === undefined) {
          return;
        }

        const errorResponses = httpOperation.responses.filter((response) =>
          isErrorResponse(response.statusCodes),
        );
        if (errorResponses.length === 0) {
          context.reportDiagnostic({ target: operation, messageId: "missingErrorResponse" });
          reported.add(source);
          return;
        }

        const invalidBody = errorResponses.some((response) =>
          response.responses.some(
            ({ body }) =>
              body !== undefined &&
              (body.bodyKind !== "single" ||
                !isStandardError(metadata.getEffectivePayloadType(body.type, Visibility.Read))),
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
    const members = [...type.variants.values()]
      .map((variant) => variant.type)
      .filter((member) => !isNullType(member));
    return members.length === 1 && isStandardError(members[0]);
  }
  if (type.kind !== "Model") {
    return false;
  }
  while (type.sourceModel) {
    type = type.sourceModel;
  }
  return (
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
