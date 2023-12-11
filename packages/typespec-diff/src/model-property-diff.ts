import { getVisibility, ModelProperty } from "@typespec/compiler";
import _ from "lodash";
import { diffArray } from "./array-diff.js";
import { diffConstraints } from "./constraint-diff.js";
import { diffDecorators } from "./decorator-diff.js";
import { createDiffFunction } from "./diff.js";
import { DiffContext, reportMessage } from "./rules.js";
import { diffTypes } from "./type-diff.js";
import { isSameType } from "./utils.js";
const { isEqual } = _;

export const diffModelProperties = createDiffFunction(
  (oldProp: ModelProperty, newProp: ModelProperty, ctx: DiffContext) => {
    if (oldProp.default && !newProp.default) {
      reportMessage(
        {
          code: "AddedDefaultValue",
          newType: newProp,
          params: {
            propertyName: oldProp.name,
          },
        },
        ctx
      );
    } else if (!oldProp.default && newProp.default) {
      reportMessage(
        {
          code: "RemovedDefaultValue",
          newType: newProp,
          params: {
            propertyName: oldProp.name,
          },
        },
        ctx
      );
    } else if (oldProp.default && newProp.default) {
      const defaultDifference = diffTypes(oldProp.default, newProp.default, ctx);
      if (defaultDifference.length) {
        reportMessage(
          {
            code: "DifferentDefaultValue",
            newType: newProp,
            params: {
              propertyName: oldProp.name,
            },
          },
          ctx
        );
      }
    }
    if (!isSameType(oldProp.type, newProp.type)) {
      reportMessage(
        {
          code: "ChangedPropertyType",
          params: {
            propertyName: oldProp.name,
          },
          oldType: oldProp,
          newType: newProp,
        },
        ctx
      );
    }

    // diff visibility
    const [oldVisibilities, newVisibilities] = [
      getVisibility(ctx.oldProgram, oldProp),
      getVisibility(ctx.newProgram, newProp),
    ];
    if (!isEqual(oldVisibilities, newVisibilities)) {
      reportMessage(
        {
          code: "VisibilityChanged",
          params: {
            propertyName: oldProp.name,
          },
          newType: newProp,
          oldType: oldProp,
        },
        ctx
      );
    }
    diffArray(oldProp, newProp, ctx);
    diffConstraints(oldProp, newProp, ctx);
    diffTypes(oldProp.type, newProp.type, ctx);
    diffDecorators(oldProp, newProp, ctx);
  }
);
