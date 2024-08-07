import {
  createRule,
  DecoratedType,
  DiagnosticTarget,
  getLocationContext,
  getTypeName,
  Namespace,
  paramMessage,
  Type,
} from "@typespec/compiler";

export const noPrivateUsage = createRule({
  name: "no-private-usage",
  description: "Verify that elements inside Private namespace are not referenced.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-private-usage",
  messages: {
    default: paramMessage`Referencing elements inside Private namespace "${"ns"}" is not allowed.`,
  },
  create(context) {
    function checkReference(origin: Type, type: Type, target: DiagnosticTarget) {
      if (getLocationContext(context.program, origin).type !== "project") {
        return;
      }
      if (getLocationContext(context.program, type).type === "project") {
        return;
      }
      if (isInPrivateNamespace(type)) {
        context.reportDiagnostic({
          target,
          format: { ns: getTypeName(type.namespace) },
        });
      }
    }

    function checkDecorators(type: Type & DecoratedType) {
      if (getLocationContext(context.program, type).type !== "project") {
        return;
      }
      for (const decorator of type.decorators) {
        if (
          decorator.definition &&
          isInPrivateNamespace(decorator.definition) &&
          getLocationContext(context.program, decorator.definition).type !== "project"
        ) {
          context.reportDiagnostic({
            target: decorator.node ?? type,
            format: { ns: getTypeName(decorator.definition.namespace) },
          });
        }
      }
    }
    return {
      model: (model) => {
        checkDecorators(model);
        model.baseModel && checkReference(model, model.baseModel, model);
      },
      modelProperty: (prop) => {
        checkDecorators(prop);
        checkReference(prop, prop.type, prop);
      },
      unionVariant: (variant) => {
        checkDecorators(variant);
        checkReference(variant, variant.type, variant);
      },
      operation: (type) => {
        checkDecorators(type);
      },
      interface: (type) => {
        checkDecorators(type);
      },
      enum: (type) => {
        checkDecorators(type);
      },
      union: (type) => {
        checkDecorators(type);
      },
    };
  },
});

function isInPrivateNamespace(type: Type): type is Type & { namespace: Namespace } {
  if (!("namespace" in type)) {
    return false;
  }
  let current = type;
  while (current.namespace) {
    if (current.namespace?.name === "Private") {
      return true;
    }
    current = current.namespace;
  }
  return false;
}
