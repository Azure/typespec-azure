import { getMaxItems, getMinItems, getPattern, Model, ModelProperty } from "@typespec/compiler";
import { DiffContext, reportMessage } from "./rules.js";

// @minItems @maxItems
export function diffArray(
  oldType: ModelProperty | Model,
  newType: ModelProperty | Model,
  ctx: DiffContext
) {
  const [oldMaxItems, newMaxItems] = [
    getMaxItems(ctx.oldProgram, oldType),
    getMaxItems(ctx.newProgram, newType),
  ];
  if (oldMaxItems !== newMaxItems) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "MaxItems",
          oldConstraint: oldMaxItems?.toString() ?? "",
          newConstraint: newMaxItems?.toString() ?? "",
        },
      },
      ctx
    );
  }
  const [oldMinItems, newMinItems] = [
    getMinItems(ctx.oldProgram, oldType),
    getMinItems(ctx.newProgram, newType),
  ];
  if (oldMinItems !== newMinItems) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "MinItems",
          oldConstraint: oldMinItems?.toString() ?? "",
          newConstraint: newMinItems?.toString() ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }
  // diff pattern
  const [oldPattern, newPattern] = [
    getPattern(ctx.oldProgram, oldType),
    getPattern(ctx.newProgram, newType),
  ];
  if (oldPattern !== newPattern) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "Pattern",
          oldConstraint: oldPattern ?? "",
          newConstraint: newPattern ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }
}
