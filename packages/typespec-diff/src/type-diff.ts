import {
  BooleanLiteral,
  Enum,
  EnumMember,
  Model,
  NumericLiteral,
  Scalar,
  StringLiteral,
  Type,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { diffEnum } from "./enum-diff.js";
import { diffModels } from "./model-diff.js";
import { DiffContext, DiffMessage, diffAssert, reportMessage } from "./rules.js";
import { diffScalar } from "./scalar-diff.js";
import { diffUnions } from "./union-diff.js";

export const diffTypes = (oldType: Type, newType: Type, ctx: DiffContext): DiffMessage[] => {
  const msgs = [];
  if (oldType.kind !== newType.kind) {
    msgs.push(
      reportMessage(
        {
          code: "ChangedType",
          params: {
            oldType: oldType.kind,
            newType: newType.kind,
          },
          oldType,
          newType,
        },
        ctx
      )
    );
    return msgs.filter((m) => m) as DiffMessage[];
  }
  switch (oldType.kind) {
    case "Model": {
      return diffModels(oldType, newType as Model, ctx);
    }
    case "Enum": {
      return diffEnum(oldType, newType as Enum, ctx);
    }
    case "Union": {
      return diffUnions(oldType, newType as Union, ctx);
    }
    case "UnionVariant": {
      return diffTypes(oldType.type, (newType as UnionVariant).type, ctx);
    }
    case "Boolean": {
      if (oldType.value !== (newType as BooleanLiteral).value) {
        msgs.push(
          reportMessage(
            {
              code: "DifferentBooleanLiteral",
              params: {
                oldLiteral: (oldType as BooleanLiteral).value.toString(),
                newLiteral: (newType as BooleanLiteral).value.toString(),
              },
              oldType,
              newType,
            },
            ctx
          )
        );
      }
      break;
    }
    case "EnumMember": {
      if (oldType.value !== (newType as EnumMember).value) {
        const newEnum = newType as EnumMember;
        msgs.push(
          reportMessage(
            {
              code: "DifferentEnumValue",
              params: {
                oldEnumValue: oldType.value ? oldType.value.toString() : "",
                newEnumValue: newEnum.value !== undefined ? newEnum.value.toString() : "",
              },
              oldType,
              newType,
            },
            ctx
          )
        );
      }
      break;
    }
    case "Number": {
      if (oldType.value !== (newType as NumericLiteral).value) {
        msgs.push(
          reportMessage(
            {
              code: "DifferentNumericLiteral",
              params: {
                oldLiteral: oldType.value.toString(),
                newLiteral: (newType as NumericLiteral).value.toString(),
              },
              oldType,
              newType,
            },
            ctx
          )
        );
      }
      break;
    }
    case "String": {
      if (oldType.value !== (newType as StringLiteral).value) {
        msgs.push(
          reportMessage(
            {
              code: "DifferentStringLiteral",
              params: {
                oldLiteral: (oldType as StringLiteral).value,
                newLiteral: (newType as StringLiteral).value,
              },
              oldType,
              newType,
            },
            ctx
          )
        );
      }
      break;
    }
    case "Scalar": {
      return diffScalar(oldType as Scalar, newType as Scalar, ctx);
    }
    case "Tuple":
    case "Intrinsic":
    case "TemplateParameter":
    case "Object":
    case "Projection":
    case "Function":
    case "Decorator":
    case "FunctionParameter":
      break;
    default:
      diffAssert(`Unsupported type: '${oldType.kind}'`, oldType);
  }
  return msgs.filter((m) => m) as DiffMessage[];
};
