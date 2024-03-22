import { Enum, Model, Operation, createRule, getDoc, paramMessage } from "@typespec/compiler";
import {
  isExcludedCoreType,
  isInlineModel,
  isTemplateDeclarationType,
  isTemplatedInterfaceOperation,
  isTemplatedOperationSignature,
} from "./utils.js";

export const requireDocumentation = createRule({
  name: "documentation-required",
  description: "Require documentation over enums, models, and operations.",
  severity: "warning",
  messages: {
    default: paramMessage`The ${"kind"} named '${"name"}' should have a documentation or description, use doc comment /** */ to provide it.`,
  },
  create(context) {
    return {
      enum: (enumObj: Enum) => {
        if (!getDoc(context.program, enumObj) && !isExcludedCoreType(context.program, enumObj)) {
          context.reportDiagnostic({
            target: enumObj,
            format: { kind: enumObj.kind, name: enumObj.name },
          });
        }
        for (const member of enumObj.members.values()) {
          if (!getDoc(context.program, member)) {
            context.reportDiagnostic({
              target: member,
              format: { kind: member.kind, name: member.name },
            });
          }
        }
      },
      operation: (operation: Operation) => {
        // Don't pay attention to operations on templated interfaces that
        // haven't been filled in with parameters yet
        if (
          !isTemplatedInterfaceOperation(operation) &&
          !isTemplatedOperationSignature(operation) &&
          !isExcludedCoreType(context.program, operation)
        ) {
          if (!getDoc(context.program, operation)) {
            context.reportDiagnostic({
              target: operation,
              format: { kind: operation.kind, name: operation.name },
            });
          }

          for (const param of operation.parameters.properties.values()) {
            if (!getDoc(context.program, param)) {
              context.reportDiagnostic({
                target: param,
                format: { kind: param.kind, name: param.name },
              });
            }
          }
        }
      },
      model: (model: Model) => {
        // it's by design that the `getDoc` function can't get the `doc` for template declaration type.
        if (
          !isTemplateDeclarationType(model) &&
          !isInlineModel(model) &&
          !isExcludedCoreType(context.program, model) &&
          model.name !== "object"
        ) {
          if (!getDoc(context.program, model)) {
            context.reportDiagnostic({
              target: model,
              format: { kind: model.kind, name: model.name },
            });
          }
          for (const prop of model.properties.values()) {
            if (!getDoc(context.program, prop)) {
              context.reportDiagnostic({
                target: prop,
                format: { kind: prop.kind, name: prop.name },
              });
            }
          }
        }
      },
    };
  },
});
