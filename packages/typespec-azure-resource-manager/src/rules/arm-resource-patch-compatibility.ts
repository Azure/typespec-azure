import {
  getFormat,
  getMaxItemsAsNumeric,
  getMaxLengthAsNumeric,
  getMaxValueAsNumeric,
  getMaxValueExclusiveAsNumeric,
  getMinItemsAsNumeric,
  getMinLengthAsNumeric,
  getMinValueAsNumeric,
  getMinValueExclusiveAsNumeric,
  isNullType,
  Numeric,
  type ModelProperty,
  type Program,
  type Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { getSingleNonNullMember } from "./model-utils.js";

type Bound = { value: Numeric; exclusive: boolean };

export function createPatchPropertyCompatibility(
  program: Program,
): (patch: ModelProperty, put: ModelProperty) => boolean {
  return (patch, put) => {
    const source = valueType(patch.type);
    const target = valueType(put.type);
    // Multi-type unions and enums require a value-set comparison, not direct bounds.
    if (!source || !target || source.kind === "Enum" || target.kind === "Enum") return true;
    const format = constraint(put, target, getFormat);
    if (format !== undefined && constraint(patch, source, getFormat) !== format) return false;
    for (const [getter, minimum, items] of [
      [getMinLengthAsNumeric, true, false],
      [getMaxLengthAsNumeric, false, false],
      [getMinItemsAsNumeric, true, true],
      [getMaxItemsAsNumeric, false, true],
    ] as const) {
      const limit = constraint(put, target, getter);
      if (limit === undefined || (minimum && limit.lte(Numeric("0")))) continue;
      const value =
        constraint(patch, source, getter) ??
        (source.kind === "String" && !items ? Numeric(String(source.value.length)) : undefined);
      if (value === undefined || (minimum ? value.lt(limit) : value.gt(limit))) return false;
    }

    // Comparing different intrinsic numeric ranges would require a type-subset solver.
    if (
      source.kind === "Scalar" &&
      target.kind === "Scalar" &&
      $(program).scalar.getStdBase(source) !== $(program).scalar.getStdBase(target)
    ) {
      return true;
    }
    return [true, false].every((minimum) => {
      const limit = numericBound(put, target, minimum);
      if (!limit) return true;
      const value = numericBound(patch, source, minimum);
      if (!value) return false;
      if (value.value.gte(limit.value) && value.value.lte(limit.value)) {
        return !limit.exclusive || value.exclusive;
      }
      return minimum ? value.value.gt(limit.value) : value.value.lt(limit.value);
    });
  };

  function constraint<T>(
    property: ModelProperty,
    type: Type,
    getter: (program: Program, type: Type) => T | undefined,
  ): T | undefined {
    const own = getter(program, property);
    if (own !== undefined) return own;
    for (let current: Type | undefined = type; current;) {
      const value = getter(program, current);
      if (value !== undefined) return value;
      current =
        current.kind === "Scalar"
          ? current.baseScalar
          : current.kind === "Model"
            ? current.baseModel
            : undefined;
    }
    return undefined;
  }

  function numericBound(property: ModelProperty, type: Type, minimum: boolean): Bound | undefined {
    if (type.kind === "Number") return { value: type.numericValue, exclusive: false };
    const inclusive = constraint(
      property,
      type,
      minimum ? getMinValueAsNumeric : getMaxValueAsNumeric,
    );
    const exclusive = constraint(
      property,
      type,
      minimum ? getMinValueExclusiveAsNumeric : getMaxValueExclusiveAsNumeric,
    );
    let bound: Bound;
    if (
      exclusive !== undefined &&
      (inclusive === undefined || (minimum ? exclusive.gte(inclusive) : exclusive.lte(inclusive)))
    ) {
      bound = { value: exclusive, exclusive: true };
    } else if (inclusive !== undefined) {
      bound = { value: inclusive, exclusive: false };
    } else {
      return undefined;
    }
    if (!$(program).scalar.extendsInteger(type)) return bound;
    const integer = bound.value.asBigInt();
    const truncated = integer ?? BigInt(bound.value.toString().split(".")[0]);
    const adjustment =
      integer !== null
        ? bound.exclusive
          ? minimum
            ? 1n
            : -1n
          : 0n
        : minimum
          ? bound.value.gt(Numeric("0"))
            ? 1n
            : 0n
          : bound.value.lt(Numeric("0"))
            ? -1n
            : 0n;
    return { value: Numeric((truncated + adjustment).toString()), exclusive: false };
  }
}

function valueType(type: Type): Type | undefined {
  return isNullType(type) ? undefined : type.kind === "Union" ? getSingleNonNullMember(type) : type;
}
