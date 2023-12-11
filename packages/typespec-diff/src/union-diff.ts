import { Union } from "@typespec/compiler";
import { diffDecorators } from "./decorator-diff.js";
import { createDiffFunction } from "./diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { diffTypes } from "./type-diff.js";
import { diffMaps } from "./utils.js";

export const diffUnions = createDiffFunction((oldType: Union, newType: Union, ctx: DiffContext) => {
  diffMaps((oldType as Union).variants, (newType as Union).variants, ctx, {
    onAddition(name, newType, ctx) {
      if (typeof name === "string")
        reportMessage(
          {
            code: "AddedVariant",
            params: {
              variantName: name,
            },
            newType,
          },
          ctx
        );
    },
    onRemove(name, oldType, ctx) {
      if (typeof name === "string")
        reportMessage(
          {
            code: "RemovedVariant",
            params: {
              variantName: name,
            },
            oldType,
          },
          ctx
        );
    },
    onUpdate(oldType, newType, ctx) {
      if (typeof oldType.name === "string") {
        diffTypes(oldType, newType, ctx);
      }
    },
  });
  diffDecorators(oldType, newType, ctx);
});
