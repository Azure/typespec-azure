import { Scalar } from "@typespec/compiler";
import { diffConstraints } from "./constraint-diff.js";
import { createDiffFunction } from "./diff.js";
import { DiffContext } from "./rules.js";

export const diffScalar = createDiffFunction(
  (oldScalar: Scalar, newScalar: Scalar, ctx: DiffContext) => {
    diffConstraints(oldScalar, newScalar, ctx);
  }
);
