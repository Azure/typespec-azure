import { DecoratorApplication, Type } from "@typespec/compiler";
import { DiffContext, reportMessage } from "./rules.js";
import { getArgsIndex, isSameType } from "./utils.js";

export const diffDecorators = (oldType: Type, newType: Type, ctx: DiffContext) => {
  const oldDecorators: DecoratorApplication[] = (oldType as any).decorators || [];
  const newDecorators: DecoratorApplication[] = (newType as any).decorators || [];

  const ignoredDecorators = ["$doc"];

  function getDecoratorName(functionName: string) {
    return functionName.replace("$", "@");
  }

  oldDecorators
    .filter((d) => !ignoredDecorators.some((n) => d.decorator.name === n))
    .forEach((oldDecoratorApp) => {
      const newDecoratorApp = newDecorators.find(
        (d) => d.decorator.name === oldDecoratorApp.decorator.name
      );
      if (!newDecoratorApp) {
        reportMessage(
          {
            code: "RemovedDecorator",
            params: {
              decoratorName: getDecoratorName(oldDecoratorApp.decorator.name),
            },
            oldType,
            newType,
          },
          ctx
        );
      } else {
        newDecoratorApp.args.forEach((v, i) => {
          if (oldDecoratorApp.args[i]) {
            const result = isSameType(oldDecoratorApp.args[i].value, v.value);
            if (!result) {
              reportMessage(
                {
                  code: "DecoratorArgumentChange",
                  params: {
                    decoratorName: getDecoratorName(oldDecoratorApp.decorator.name),
                    argIndex: getArgsIndex(i),
                  },
                  oldType: v.value,
                },
                ctx
              );
            }
          } else {
            reportMessage(
              {
                code: "AddedDecoratorArgument",
                params: {
                  decoratorName: getDecoratorName(oldDecoratorApp.decorator.name),
                  argIndex: getArgsIndex(i),
                },
                newType: v.value,
              },
              ctx
            );
          }
        });
        oldDecoratorApp.args.forEach((v, i) => {
          if (!newDecoratorApp.args[i]) {
            reportMessage(
              {
                code: "RemovedDecoratorArgument",
                params: {
                  decoratorName: getDecoratorName(oldDecoratorApp.decorator.name),
                  argIndex: getArgsIndex(i),
                },
                oldType: v.value,
              },
              ctx
            );
          }
        });
      }
    });
  newDecorators.forEach((decoratorApp) => {
    const oldDecoratorApp = oldDecorators.find(
      (d) => d.decorator.name === decoratorApp.decorator.name
    );
    if (!oldDecoratorApp) {
      reportMessage(
        {
          code: "AddedDecorator",
          params: {
            decoratorName: decoratorApp.decorator.name,
          },
          oldType,
          newType,
        },
        ctx
      );
    }
  });
};
