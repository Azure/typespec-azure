import { Type } from "@typespec/compiler";
import { createDiffFunction } from "./diff.js";
import { DiffContext } from "./rules.js";
import { diffTypes } from "./type-diff.js";

export const diffReturns = createDiffFunction(
  (oldReturn: Type, newReturn: Type, ctx: DiffContext) => {
    diffTypes(oldReturn, newReturn, { ...ctx, direction: "Response" });
  }
);
