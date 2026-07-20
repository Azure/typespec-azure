import {
  Operation,
  Type,
  createRule,
  isErrorModel,
  paramMessage,
} from "@typespec/compiler";
import { Visibility, createMetadataInfo } from "@typespec/http";
import { getCachedHttpOperation } from "./utils.js";

export const responseSchemaMultiStatusCodeRule = createRule({
  name: "response-schema-problem",
  description: "Warn about operations having multiple non-error response schemas.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/response-schema-problem",
  messages: {
    multipleSuccessSchemas: paramMessage`Operation '${"name"}' has multiple non-error response schemas. Did you forget to add '@error' to one of them?`,
  },
  create(context) {
    // Create MetadataInfo once per lint run instead of per-operation.
    // MetadataInfo uses internal lazy caching, so reuse across operations
    // avoids recomputing effective payload types.
    const metadataInfo = createMetadataInfo(context.program, {
      canonicalVisibility: Visibility.Read,
    });
    return {
      operation: (op: Operation) => {
        const httpOp = getCachedHttpOperation(context.program, op);
        const responses = httpOp.responses.flatMap((x) => x.responses);

        let firstResponse: Type | undefined = undefined;
        for (const resp of responses) {
          const body = resp.body;
          if (body === undefined) continue;
          const bodyType = body.type;

          let currResponse: Type | undefined;
          switch (bodyType.kind) {
            case "Model":
              const effModel = metadataInfo.getEffectivePayloadType(bodyType, Visibility.Read);
              if (isErrorModel(context.program, effModel)) continue;
              currResponse = effModel;
              break;
            default:
              currResponse = bodyType;
              break;
          }
          if (firstResponse === undefined) {
            firstResponse = currResponse;
          } else if (firstResponse !== currResponse) {
            context.reportDiagnostic({
              target: op,
              messageId: "multipleSuccessSchemas",
              format: {
                name: op.name,
              },
            });
            return;
          }
        }
      },
    };
  },
});
