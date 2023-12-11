import { Enum } from "@typespec/compiler";
import { diffDecorators } from "./decorator-diff.js";
import { createDiffFunction } from "./diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { diffTypes } from "./type-diff.js";
import { diffMaps } from "./utils.js";

export const diffEnum = createDiffFunction((oldType: Enum, newType: Enum, ctx: DiffContext) => {
  diffMaps(oldType.members, newType.members, ctx, {
    onAddition(name, newType, ctx) {
      reportMessage(
        {
          code: "AddedEnumValue",
          params: {
            enumValue: name,
          },
          newType,
        },
        ctx
      );
    },
    onRemove(name, oldType, ctx) {
      reportMessage(
        {
          code: "RemovedEnumValue",
          params: {
            enumValue: name,
          },
          oldType,
        },
        ctx
      );
    },
    onUpdate(oldType, newType, ctx) {
      diffTypes(oldType, newType, ctx);
    },
  });
  const oldConstantStatus = oldType.members.size === 1;
  const newConstantStatus = newType.members.size === 1;
  if (oldConstantStatus !== newConstantStatus) {
    /*reportMessage(
      {
        code: "ConstantStatusHasChanged",
        params: {
          newStatus: newConstantStatus.toString(),
          oldStatus: oldConstantStatus.toString(),
        },
        newType,
        oldType,
      },
      ctx
    );*/
  }
  diffDecorators(oldType, newType, ctx);
});
