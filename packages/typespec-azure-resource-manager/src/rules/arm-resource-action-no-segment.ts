import { DecoratorApplication, Operation, createRule } from "@typespec/compiler";
import { isInternalTypeSpec } from "./utils.js";

export const armResourceActionNoSegmentRule = createRule({
  name: "arm-resource-action-no-segment",
  severity: "warning",
  description: "`@armResourceAction` should not be used with `@segment`.",
  messages: {
    default:
      "`@armResourceAction` should not be used with `@segment`. Instead, use `@action(...)` if you need to rename the action, or omit.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isInternalTypeSpec(context.program, operation)) {
          return;
        }
        const armResourceActionDec = getDecorator(operation, "armResourceAction");
        const segmentDec = getDecorator(operation, "segment");
        if (armResourceActionDec && segmentDec) {
          context.reportDiagnostic({
            target: segmentDec.node ?? operation,
          });
        }
      },
    };
  },
});

function getDecorator(type: Operation, name: string): DecoratorApplication | undefined {
  const decorator = type.decorators.filter((d) => `$${name}` === d.decorator.name);
  if (decorator && decorator.length === 1) return decorator[0];
  return undefined;
}
