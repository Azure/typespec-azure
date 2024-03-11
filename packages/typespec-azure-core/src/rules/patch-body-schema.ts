import { Operation, createRule, ignoreDiagnostics, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const patchBodySchemaRule = createRule({
  name: "patch-body-schema-problem",
  description: "Warn about problematic PATCH bodies.",
  severity: "warning",
  messages: {
    required: paramMessage`Operation '${"name"}' has a PATCH body with a required property. This is not recommended.`,
    default: paramMessage`Operation '${"name"}' has a PATCH body with a default value. This is not recommended.`,
    createVisibility: paramMessage`Operation '${"name"}' has a PATCH body with a "create" visibility. This is not recommended.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        const httpOp = ignoreDiagnostics(getHttpOperation(context.program, op));
        //   const responses = httpOp.responses.flatMap((x) => x.responses);
        //   const metadataInfo = createMetadataInfo(context.program, {
        //     canonicalVisibility: Visibility.Read,
        //   });

        //   let firstResponse: Type | undefined = undefined;
        //   for (const resp of responses) {
        //     const body = resp.body;
        //     if (body === undefined) continue;
        //     const bodyType = body.type;

        //     let currResponse: Type | undefined = undefined;
        //     switch (bodyType.kind) {
        //       case "Model":
        //         const effModel = metadataInfo.getEffectivePayloadType(bodyType, Visibility.Read);
        //         if (isErrorModel(context.program, effModel)) continue;
        //         currResponse = effModel;
        //         break;
        //       default:
        //         currResponse = bodyType;
        //         break;
        //     }
        //     if (firstResponse === undefined) {
        //       firstResponse = currResponse;
        //     } else if (firstResponse !== currResponse) {
        //       context.reportDiagnostic({
        //         target: op,
        //         messageId: "multipleSuccessSchemas",
        //         format: {
        //           name: op.name,
        //         },
        //       });
        //       return;
        //     }
        //   }
      },
    };
  },
});
