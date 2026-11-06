import {
  getEncode,
  getFormat,
  getMaxItemsAsNumeric,
  getMaxLengthAsNumeric,
  getMaxValueAsNumeric,
  getMaxValueExclusiveAsNumeric,
  getMinItemsAsNumeric,
  getMinLengthAsNumeric,
  getMinValueAsNumeric,
  getMinValueExclusiveAsNumeric,
  isArrayModelType,
  isNeverType,
  isNullType,
  isUnknownType,
  Numeric,
  type IntrinsicScalarName,
  type Model,
  type ModelProperty,
  type Program,
  type Scalar,
  type Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import {
  resolveRequestVisibility,
  Visibility,
  type HttpOperation,
  type MetadataInfo,
} from "@typespec/http";
import { walkJsonProperties } from "./model-utils.js";

type Shape = { type: Type; property?: ModelProperty };
type Bound = { value: Numeric; exclusive: boolean };

export function createPatchPropertyCompatibility(
  program: Program,
  metadataInfo: MetadataInfo,
  patch: HttpOperation,
  put: HttpOperation,
): (patch: ModelProperty, put: ModelProperty) => boolean {
  const patchVisibility = resolveRequestVisibility(program, patch.operation, patch.verb);
  const putVisibility = resolveRequestVisibility(program, put.operation, put.verb);
  const visiting: [Type, Type, boolean, boolean][] = [];
  const intrinsicBounds = new Map<Scalar, [Numeric, Numeric]>();
  const integers: [IntrinsicScalarName, number, boolean][] = [
    ["int8", 8, true],
    ["int16", 16, true],
    ["int32", 32, true],
    ["int64", 64, true],
    ["uint8", 8, false],
    ["uint16", 16, false],
    ["uint32", 32, false],
    ["uint64", 64, false],
  ];
  for (const [name, bits, signed] of integers) {
    const limit = 2n ** BigInt(signed ? bits - 1 : bits);
    intrinsicBounds.set(program.checker.getStdType(name), [
      Numeric(signed ? (-limit).toString() : "0"),
      Numeric((limit - 1n).toString()),
    ]);
  }
  for (const [name, limit] of [
    ["safeint", "9007199254740991"],
    ["float32", "3.4028234663852886e38"],
    ["float64", "1.7976931348623157e308"],
  ] as const) {
    intrinsicBounds.set(program.checker.getStdType(name), [Numeric(`-${limit}`), Numeric(limit)]);
  }

  return (patch, put) =>
    compatible({ type: patch.type, property: patch }, { type: put.type, property: put });

  function compatible(source: Shape, target: Shape, item = false, reset = true): boolean {
    if (isNeverType(source.type) || isUnknownType(target.type)) return true;
    if (reset && isNullType(source.type)) return true;
    if (
      visiting.some(
        ([s, t, i, r]) => s === source.type && t === target.type && i === item && r === reset,
      )
    ) {
      return constraintsCompatible(source, target);
    }
    visiting.push([source.type, target.type, item, reset]);
    try {
      if (source.type.kind === "Union") {
        return [...source.type.variants.values()].every((variant) =>
          compatible({ ...source, type: variant.type }, target, item, reset),
        );
      }
      if (source.type.kind === "Enum") {
        return [...source.type.members.values()].every((member) =>
          compatible({ ...source, type: member }, target, item, reset),
        );
      }
      if (source.type.kind === "EnumMember") {
        return compatible(
          {
            ...source,
            type: program.checker.createLiteralType(source.type.value ?? source.type.name),
          },
          target,
          item,
          reset,
        );
      }
      if (target.type.kind === "Union") {
        return [...target.type.variants.values()].some((variant) =>
          compatible(source, { ...target, type: variant.type }, item, reset),
        );
      }
      if (target.type.kind === "Enum") {
        return [...target.type.members.values()].some((member) =>
          compatible(source, { ...target, type: member }, item, reset),
        );
      }
      if (target.type.kind === "EnumMember") {
        return compatible(
          source,
          {
            ...target,
            type: program.checker.createLiteralType(target.type.value ?? target.type.name),
          },
          item,
          reset,
        );
      }

      if (!constraintsCompatible(source, target)) return false;
      const sourceWire = wireType(source);
      const targetWire = wireType(target);
      if (targetWire.encoding !== undefined && sourceWire.encoding !== targetWire.encoding) {
        return false;
      }
      const sourceType = sourceWire.type;
      const targetType = targetWire.type;
      if (sourceType.kind === "Model" && targetType.kind === "Model") {
        const sourceCollection = collectionType(sourceType);
        const targetCollection = collectionType(targetType);
        if (isArrayModelType(sourceCollection) || isArrayModelType(targetCollection)) {
          return (
            isArrayModelType(sourceCollection) &&
            isArrayModelType(targetCollection) &&
            compatible(
              { type: sourceCollection.indexer.value },
              { type: targetCollection.indexer.value },
              true,
              false,
            )
          );
        }
        if (
          sourceCollection.indexer &&
          (!targetCollection.indexer ||
            !compatible(
              { type: sourceCollection.indexer.value },
              { type: targetCollection.indexer.value },
              true,
            ))
        ) {
          return false;
        }
        const putProperties = payloadProperties(targetType, put, putVisibility, item);
        for (const [name, property] of payloadProperties(
          sourceType,
          patch,
          patchVisibility,
          item,
        )) {
          const counterpart = putProperties.get(name);
          if (counterpart) {
            if (
              !compatible(
                { type: property.type, property },
                { type: counterpart.type, property: counterpart },
                item,
              )
            ) {
              return false;
            }
          } else if (
            !targetCollection.indexer ||
            !compatible(
              { type: property.type, property },
              { type: targetCollection.indexer.value },
              true,
            )
          ) {
            return false;
          }
        }
        return true;
      }
      if (
        $(program).scalar.extendsInteger(sourceType) &&
        $(program).scalar.extendsInteger(targetType)
      ) {
        return true;
      }
      return $(program).type.isAssignableTo(sourceType, targetType);
    } finally {
      visiting.pop();
    }
  }

  function payloadProperties(
    model: Model,
    operation: HttpOperation,
    visibility: Visibility,
    item: boolean,
  ): Map<string, ModelProperty> {
    return new Map(
      [...walkJsonProperties(program, model)].filter(
        ([, property]) =>
          !isNeverType(property.type) &&
          metadataInfo.isPayloadProperty(
            property,
            item ? visibility | Visibility.Item : visibility,
            operation.parameters.body?.bodyKind === "single"
              ? operation.parameters.body.isExplicit
              : false,
          ),
      ),
    );
  }

  function collectionType(model: Model): Model {
    while (!model.indexer && model.baseModel) model = model.baseModel;
    return model;
  }

  function wireType(shape: Shape): { type: Type; encoding?: string } {
    let encode = shape.property && getEncode(program, shape.property);
    let type = shape.type;
    while (type.kind === "Scalar") {
      encode ??= getEncode(program, type);
      if (encode) {
        return {
          type: $(program).scalar.getStdBase(encode.type) ?? encode.type,
          encoding: encode.encoding,
        };
      }
      if (program.checker.isStdType(type)) {
        const encoding =
          type.name === "utcDateTime" || type.name === "offsetDateTime"
            ? "rfc3339"
            : type.name === "bytes"
              ? "base64"
              : type.name === "duration"
                ? "ISO8601"
                : undefined;
        return {
          type: encoding ? program.checker.getStdType("string") : type,
          encoding,
        };
      }
      if (!type.baseScalar) return { type };
      type = type.baseScalar;
    }
    return { type };
  }

  function constraint<T>(
    shape: Shape,
    getter: (program: Program, type: Type) => T | undefined,
  ): T | undefined {
    const propertyValue = shape.property && getter(program, shape.property);
    if (propertyValue !== undefined) return propertyValue;
    let type: Type | undefined = shape.type;
    while (type) {
      const value = getter(program, type);
      if (value !== undefined) return value;
      type = type.kind === "Scalar" ? type.baseScalar : undefined;
    }
    return undefined;
  }

  function lengthBound(
    shape: Shape,
    getter: typeof getMinLengthAsNumeric,
    items: boolean,
  ): Numeric | undefined {
    const explicit = constraint(shape, getter);
    if (explicit !== undefined) return explicit;
    if (!items && shape.type.kind === "String") return Numeric(String(shape.type.value.length));
    if (items && shape.type.kind === "Tuple") return Numeric(String(shape.type.values.length));
    return undefined;
  }

  function lengthCompatible(
    source: Shape,
    target: Shape,
    getter: typeof getMinLengthAsNumeric,
    minimum: boolean,
    items = false,
  ): boolean {
    const limit = lengthBound(target, getter, items);
    if (limit === undefined || (minimum && limit.lte(Numeric("0")))) return true;
    const value = lengthBound(source, getter, items);
    return value !== undefined && (minimum ? value.gte(limit) : value.lte(limit));
  }

  function numericBound(shape: Shape, minimum: boolean): Bound | undefined {
    if (shape.type.kind === "Number") {
      return { value: shape.type.numericValue, exclusive: false };
    }
    const inclusive = constraint(shape, minimum ? getMinValueAsNumeric : getMaxValueAsNumeric);
    const exclusive = constraint(
      shape,
      minimum ? getMinValueExclusiveAsNumeric : getMaxValueExclusiveAsNumeric,
    );
    if (
      exclusive !== undefined &&
      (inclusive === undefined || (minimum ? exclusive.gte(inclusive) : exclusive.lte(inclusive)))
    ) {
      return { value: exclusive, exclusive: true };
    }
    if (inclusive !== undefined) return { value: inclusive, exclusive: false };
    if (shape.type.kind === "Scalar") {
      const base = $(program).scalar.getStdBase(shape.type);
      const intrinsic = base && intrinsicBounds.get(base);
      if (intrinsic) return { value: intrinsic[minimum ? 0 : 1], exclusive: false };
    }
    return undefined;
  }

  function numericCompatible(source: Shape, target: Shape, minimum: boolean): boolean {
    const limit = integerBound(target, numericBound(target, minimum), minimum);
    if (limit === undefined) return true;
    const value = integerBound(source, numericBound(source, minimum), minimum);
    if (value === undefined) return false;
    if (value.value.gte(limit.value) && value.value.lte(limit.value)) {
      return !limit.exclusive || value.exclusive;
    }
    return minimum ? value.value.gt(limit.value) : value.value.lt(limit.value);
  }

  function integerBound(
    shape: Shape,
    bound: Bound | undefined,
    minimum: boolean,
  ): Bound | undefined {
    if (!bound || !$(program).scalar.extendsInteger(shape.type)) return bound;
    const integer = bound.value.asBigInt();
    if (integer !== null) {
      return {
        value: Numeric((integer + (bound.exclusive ? (minimum ? 1n : -1n) : 0n)).toString()),
        exclusive: false,
      };
    }
    const truncated = BigInt(bound.value.toString().split(".")[0]);
    const adjustment = minimum
      ? bound.value.gt(Numeric("0"))
        ? 1n
        : 0n
      : bound.value.lt(Numeric("0"))
        ? -1n
        : 0n;
    return { value: Numeric((truncated + adjustment).toString()), exclusive: false };
  }

  function constraintsCompatible(source: Shape, target: Shape): boolean {
    const format = constraint(target, getFormat);
    return (
      (format === undefined || constraint(source, getFormat) === format) &&
      lengthCompatible(source, target, getMinLengthAsNumeric, true) &&
      lengthCompatible(source, target, getMaxLengthAsNumeric, false) &&
      lengthCompatible(source, target, getMinItemsAsNumeric, true, true) &&
      lengthCompatible(source, target, getMaxItemsAsNumeric, false, true) &&
      numericCompatible(source, target, true) &&
      numericCompatible(source, target, false)
    );
  }
}
