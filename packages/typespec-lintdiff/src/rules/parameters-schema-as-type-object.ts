import { createRule } from "@typespec/compiler";
import type { Type } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const parametersSchemaAsTypeObjectRule = createRule({
  name: "parameters-schema-as-type-object",
  description: "Request bodies must resolve to object schemas.",
  severity: "warning",
  messages: {
    default:
      "Request bodies must resolve to object schemas. Replace this non-object body type with a model.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);

        const body = httpOperation.parameters.body;
        if (body === undefined || body.bodyKind !== "single") {
          return;
        }

        if (isObjectSchemaType(body.type)) {
          return;
        }

        context.reportDiagnostic({
          target: body.property ?? operation,
        });
      },
    };
  },
});

function isObjectSchemaType(type: Type): boolean {
  return type.kind === "Model" && type.name !== "Array";
}
