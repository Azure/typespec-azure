import {
  CallableMessage,
  createRule,
  DecoratedType,
  DecoratorApplication,
  Enum,
  EnumMember,
  Interface,
  isTemplateInstance,
  LinterRuleContext,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  paramMessage,
  Scalar,
  Type,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";

export const friendlyNameRule = createRule({
  name: "friendly-name",
  description: "Ensures that @friendlyName is used as intended.",
  severity: "warning",
  messages: {
    scope: paramMessage`@friendlyName should not decorate ${"kind"}.`,
    template: paramMessage`@friendlyName should decorate template and use template parameter's properties in friendly name.`,
  },
  create(context) {
    return {
      model: (entity: Model) => {
        checkFriendlyName(context, entity);
      },
      modelProperty: (entity: ModelProperty) => {
        checkFriendlyName(context, entity);
      },
      scalar: (entity: Scalar) => {
        checkFriendlyName(context, entity);
      },
      interface: (entity: Interface) => {
        checkFriendlyName(context, entity);
      },
      enum: (entity: Enum) => {
        checkFriendlyName(context, entity);
      },
      enumMember: (entity: EnumMember) => {
        checkFriendlyName(context, entity);
      },
      namespace: (entity: Namespace) => {
        checkFriendlyName(context, entity);
      },
      operation: (entity: Operation) => {
        checkFriendlyName(context, entity);
      },
      union: (entity: Union) => {
        checkFriendlyName(context, entity);
      },
      unionVariant: (entity: UnionVariant) => {
        checkFriendlyName(context, entity);
      },
    };
  },
});

function checkFriendlyName(
  context: LinterRuleContext<{
    readonly scope: CallableMessage<[string]>;
    readonly template: CallableMessage<[]>;
  }>,
  type: Type,
) {
  const decorator = getFriendlyNameDecoratorOnType(type);
  if (decorator) {
    if (["Model", "Operation", "Interface", "Union"].includes(type.kind)) {
      // @friendlyName should decorate template and use template parameter's properties in friendly name.
      if (!isTemplateInstance(type) || decorator.args.length !== 2) {
        context.reportDiagnostic({
          messageId: "template",
          target: type,
          format: {},
        });
      }
    } else {
      context.reportDiagnostic({
        messageId: "scope",
        target: type,
        format: { kind: type.kind },
      });
    }
  }
}

function getFriendlyNameDecoratorOnType(type: Type): DecoratorApplication | undefined {
  const decorators = (type as DecoratedType).decorators.filter(
    (x) =>
      x.decorator.name === "$friendlyName" &&
      x.node?.kind === SyntaxKind.DecoratorExpression &&
      x.node?.parent === type.node,
  );

  return decorators[0];
}
