import type { Model, Type } from "@typespec/compiler";
import {
  createRule,
  getLocationContext,
  isArrayModelType,
  isUnknownType,
  isVoidType,
} from "@typespec/compiler";
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

        if (isVoidType(body.type) || isUnknownType(body.type)) {
          return;
        }

        if (isObjectSchemaType(body.type)) {
          return;
        }

        context.reportDiagnostic({
          target:
            body.property && getLocationContext(context.program, body.property).type === "project"
              ? body.property
              : operation,
        });
      },
    };
  },
});

function isObjectSchemaType(type: Type): boolean {
  return type.kind === "Model" && !isArraySchemaType(type);
}

function isArraySchemaType(model: Model): boolean {
  const pending = [model];
  const visited = new Set<Model>();

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (isArrayModelType(current)) {
      return true;
    }
    if (current.baseModel) {
      pending.push(current.baseModel);
    }
    if (current.sourceModel) {
      pending.push(current.sourceModel);
    }
  }
  return false;
}
