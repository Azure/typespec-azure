import {
  Operation,
  createRule,
  isTemplateInstance,
  paramMessage,
} from "@typespec/compiler";
import { getCachedHttpOperation } from "./utils.js";

const binaryContentTypes = new Set(["application/octet-stream", "multipart/form-data"]);
export const byosRule = createRule({
  name: "byos",
  description: "Use the BYOS pattern recommended for Azure Services.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/byos",
  messages: {
    default: paramMessage`The content type "${"contentType"}" indicates this operation is storing or retrieving binary data. It is recommended to use the BYOS pattern for Azure Services. https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#bring-your-own-storage-byos`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isTemplateInstance(operation)) {
          // Operation template instance are just referenced in `op is`. Main operation will be validated.
          return;
        }
        const httpOperation = getCachedHttpOperation(context.program, operation);
        if (httpOperation.parameters.body !== undefined) {
          for (const contentType of httpOperation.parameters.body.contentTypes) {
            if (binaryContentTypes.has(contentType)) {
              context.reportDiagnostic({
                format: { contentType },
                target: operation,
              });
            }
          }
        }
      },
    };
  },
});
