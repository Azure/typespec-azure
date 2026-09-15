import {
  createRule,
  fileRef,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { comparePutRequestAndResponse } from "./put-request-response-schema-utils.js";
import { isInternalTypeSpec } from "./utils.js";

export const putRequestResponseSchemaRule = createRule({
  name: "put-request-response-schema",
  description: "PUT request bodies must match the primary success response body.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/put-request-response-schema",
  docs: fileRef.fromPackageRoot("src/rules/put-request-response-schema.md"),
  messages: {
    default: paramMessage`PUT request body schema should match the ${"statusCode"} response schema.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isInternalTypeSpec(context.program, operation) ||
          isTemplateDeclarationOrInstance(operation) ||
          (operation.interface !== undefined && isTemplateDeclaration(operation.interface))
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        const comparison = comparePutRequestAndResponse(httpOperation);
        if (comparison === undefined || comparison.matches) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { statusCode: comparison.statusCode },
        });
      },
    };
  },
});
