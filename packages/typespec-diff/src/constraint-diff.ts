import {
  getFormat,
  getMaxLength,
  getMaxValue,
  getMinLength,
  getMinValue,
  isSecret,
  ModelProperty,
  Scalar,
} from "@typespec/compiler";
import { DiffContext, reportMessage } from "./rules.js";

// @minLength @minLength @maxValue @minValue @secret @format
export function diffConstraints(
  oldType: ModelProperty | Scalar,
  newType: ModelProperty | Scalar,
  ctx: DiffContext
) {
  const [oldMinLength, newMinLength] = [
    getMinLength(ctx.oldProgram, oldType),
    getMinLength(ctx.newProgram, newType),
  ];
  if (oldMinLength !== newMinLength) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "MinLength",
          oldConstraint: oldMinLength?.toString() ?? "",
          newConstraint: newMinLength?.toString() ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }
  const [oldMaxLength, newMaxLength] = [
    getMaxLength(ctx.oldProgram, oldType),
    getMaxLength(ctx.newProgram, newType),
  ];
  if (oldMaxLength !== newMaxLength) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "MaxLength",
          oldConstraint: oldMaxLength?.toString() ?? "",
          newConstraint: newMaxLength?.toString() ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }

  const [oldMinValue, newMinValue] = [
    getMinValue(ctx.oldProgram, oldType),
    getMinValue(ctx.newProgram, newType),
  ];
  if (oldMinValue !== newMinValue) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "MinValue",
          oldConstraint: oldMinValue?.toString() ?? "",
          newConstraint: newMinValue?.toString() ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }
  const [oldMaxValue, newMaxValue] = [
    getMaxValue(ctx.oldProgram, oldType),
    getMaxValue(ctx.newProgram, newType),
  ];
  if (oldMaxValue !== newMaxValue) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "MaxValue",
          oldConstraint: oldMaxValue?.toString() ?? "",
          newConstraint: newMaxValue?.toString() ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }

  const [oldSecretFlag, newSecretFlag] = [
    isSecret(ctx.oldProgram, oldType),
    isSecret(ctx.newProgram, newType),
  ];
  if (oldSecretFlag !== newSecretFlag) {
    reportMessage(
      {
        code: "ConstraintChanged",
        params: {
          constraintName: "Secret",
          oldConstraint: oldSecretFlag?.toString() ?? "",
          newConstraint: newSecretFlag?.toString() ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }

  const [oldFormat, newFormat] = [
    getFormat(ctx.oldProgram, oldType),
    getFormat(ctx.newProgram, newType),
  ];
  if (oldFormat !== newFormat) {
    reportMessage(
      {
        code: "ChangedFormat",
        params: {
          oldFormat: oldFormat ?? "",
          newFormat: newFormat ?? "",
        },
        oldType,
        newType,
      },
      ctx
    );
  }
}
