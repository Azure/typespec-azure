import {
  Model,
  Operation,
  createRule,
  getVisibility,
  ignoreDiagnostics,
  paramMessage,
} from "@typespec/compiler";
import { Visibility, createMetadataInfo, getHttpOperation } from "@typespec/http";

export const patchBodySchemaRule = createRule({
  name: "patch-body-schema-problem",
  description: "Warn about problematic PATCH bodies.",
  severity: "warning",
  messages: {
    required: paramMessage`Operation '${"name"}' has a PATCH body parameter '${"param"}' that is required.`,
    default: paramMessage`Operation '${"name"}' has a PATCH body parameter '${"param"}' that has a default value.`,
    createVisibility: paramMessage`Operation '${"name"}' has a PATCH body parameter '${"param"}' that has a "create" visibility.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        const httpOp = ignoreDiagnostics(getHttpOperation(context.program, op));
        if (httpOp.verb !== "patch") return;
        const parameters = httpOp.parameters;
        if (parameters.body === undefined) return;
        const metadataInfo = createMetadataInfo(context.program, {
          canonicalVisibility: Visibility.Read,
        });
        const effBody = metadataInfo.getEffectivePayloadType(
          parameters.body.type as Model,
          Visibility.Read
        ) as Model;
        for (const [name, prop] of effBody.properties) {
          // Check for required properties
          if (prop.optional === false) {
            context.reportDiagnostic({
              messageId: "required",
              format: {
                name: op.name,
                param: name,
              },
              target: prop,
            });
          }
          // Check for deafault values
          if (prop.default !== undefined) {
            context.reportDiagnostic({
              messageId: "default",
              format: {
                name: op.name,
                param: name,
              },
              target: prop,
            });
          }
          // Check for "create-only" visibility
          const visibility = getVisibility(context.program, prop);
          if (visibility?.length === 1 && visibility[0] === "create") {
            context.reportDiagnostic({
              messageId: "createVisibility",
              format: {
                name: op.name,
                param: name,
              },
              target: prop,
            });
          }
        }
      },
    };
  },
});
