import {
  createRule,
  fileRef,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

const validGetOperationName = /^(?:get|list)/i;

export const getOperationNameRule = createRule({
  name: "get-operation-name",
  docs: fileRef.fromPackageRoot("src/rules/get-operation-name.md"),
  description: "GET SDK method names should use 'Get' or 'List' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/get-operation-name",
  messages: {
    default: paramMessage`GET SDK method name '${"operationName"}' should use 'Get' or 'List' as the verb prefix. Changing a method name after an SDK has shipped may be a breaking change.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );

    return {
      operation: (operation) => {
        if (isTemplateDeclarationOrInstance(operation)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get") {
          return;
        }

        const operationName = getLibraryName(tcgcContext, operation, AllScopes);
        if (operationName.length === 0 || validGetOperationName.test(operationName)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { operationName },
        });
      },
    };
  },
});
