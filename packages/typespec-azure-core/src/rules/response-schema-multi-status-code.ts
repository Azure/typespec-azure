import {
  Operation,
  Type,
  createRule,
  ignoreDiagnostics,
  isErrorModel,
  paramMessage,
} from "@typespec/compiler";
import { Visibility, createMetadataInfo, getHttpOperation } from "@typespec/http";

export const responseSchemaMultiStatusCodeRule = createRule({
  name: "response-schema-problem",
  description: "Warn about operations having multiple non-error response schemas.",
  severity: "warning",
  messages: {
    multipleSuccessSchemas: paramMessage`Operation '${"name"}' has multiple non-error response schemas. Did you forget to add '@error' to one of them?`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        const httpOp = ignoreDiagnostics(getHttpOperation(context.program, op));
        const responses = httpOp.responses.flatMap((x) => x.responses);
        const metadataInfo = createMetadataInfo(context.program, {
          canonicalVisibility: Visibility.Read,
        });

        let firstResponse: Type | undefined = undefined;
        for (const resp of responses) {
          const body = resp.body;
          if (body === undefined) continue;
          const bodyType = body.type;

          let currResponse: Type | undefined = undefined;
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
