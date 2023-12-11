import { isArrayModelType, Model, ModelProperty, Operation, Program } from "@typespec/compiler";
import { getHeaderFieldOptions, getQueryParamOptions } from "@typespec/http";
import { diffModelProperties } from "./model-property-diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { diffMaps, getParameterInType } from "./utils.js";

export const diffParameters = (
  oldParam: Model,
  newParams: Model,
  oldOp: Operation,
  newOp: Operation,
  ctx: DiffContext
) => {
  diffMaps(oldParam.properties, newParams.properties, ctx, {
    onAddition: (name: string, newType, ctx) => {
      const code = !newType.optional ? "AddedRequiredParameter" : "AddedOptionalParameter";
      reportMessage(
        {
          code,
          newType,
          params: {
            parameterName: name,
            operationName: newOp.name,
          },
        },
        ctx
      );
    },
    onRemove(name, oldType, ctx) {
      const code = !oldType.optional ? "RemovedRequiredParameter" : "RemovedOptionalParameter";
      reportMessage(
        {
          code,
          oldType,
          params: {
            parameterName: name,
            operationName: newOp.name,
          },
        },
        ctx
      );
    },
    onUpdate(oldType, newType, ctx) {
      const oldParameterType = getParameterInType(ctx.oldProgram, oldOp, oldType.name);
      const newParameterType = getParameterInType(ctx.newProgram, newOp, newType.name);
      if (oldParameterType !== newParameterType) {
        reportMessage(
          {
            code: "ParameterInHasChanged",
            params: {
              oldParameterIn: oldParameterType,
              newParameterIn: newParameterType,
              parameterName: oldType.name,
            },
            oldType,
            newType,
          },
          ctx
        );
      }
      if (
        oldType.type.kind === "Model" &&
        isArrayModelType(ctx.oldProgram, oldType.type) &&
        newType.type.kind === "Model" &&
        isArrayModelType(ctx.newProgram, newType.type)
      ) {
        const oldCollectionFormat = getCollectionFormatInternal(
          ctx.oldProgram,
          oldType,
          oldParameterType
        );
        const newCollectionFormat = getCollectionFormatInternal(
          ctx.newProgram,
          newType,
          newParameterType
        );
        if (oldCollectionFormat !== newCollectionFormat) {
          reportMessage(
            {
              code: "ArrayCollectionFormatChanged",
              params: {
                newFormat: newCollectionFormat ?? "",
                oldFormat: oldCollectionFormat ?? "",
              },
              newType,
              oldType,
            },
            ctx
          );
        }
      }
      diffModelProperties(oldType, newType, { ...ctx, direction: "Request" });
    },
  });
};

function getCollectionFormatInternal(program: Program, param: ModelProperty, kind: string) {
  return (
    kind === "query"
      ? getQueryParamOptions(program, param)
      : kind === "header"
        ? getHeaderFieldOptions(program, param)
        : undefined
  )?.format;
}
