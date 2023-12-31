import {
  Operation,
  createRule,
  ignoreDiagnostics,
  isTemplateInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

const binaryContentTypes = new Set(["application/octet-stream", "multipart/form-data"]);
export const byosRule = createRule({
  name: "byos",
  description: "Use the BYOS pattern recommended for Azure Services.",
  severity: "warning",
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
        const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, operation));
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
