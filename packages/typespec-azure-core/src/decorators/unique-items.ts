import {
  DecoratorContext,
  isArrayModelType,
  isNullType,
  Model,
  ModelProperty,
  Type,
} from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { UniqueItemsDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../lib.js";

export const $uniqueItems: UniqueItemsDecorator = (
  context: DecoratorContext,
  entity: ModelProperty | Model,
) => {
  const { program } = context;
  if (entity.kind === "ModelProperty") {
    if (!isTypeOrNullableType(entity.type, (t) => t.kind === "Model" && isArrayModelType(t))) {
      reportDiagnostic(program, {
        code: "unique-items-invalid-type",
        target: entity,
      });
      return;
    }
    setUniqueItems(program, entity, true);
    return;
  }
  if (!isArrayModelType(entity)) {
    reportDiagnostic(program, {
      code: "unique-items-invalid-type",
      target: entity,
    });
    return;
  }
  setUniqueItems(program, entity, true);
};

export const [getUniqueItems, setUniqueItems] = useStateMap<Type, boolean>(
  AzureCoreStateKeys.uniqueItems,
);

function isTypeOrNullableType(type: Type, filter: (type: Type) => boolean): boolean {
  if (filter(type)) {
    return true;
  }
  if (type.kind !== "Union") {
    return false;
  }
  if (type.variants.size !== 2) return false;
  const variants = [...type.variants.values()];
  if (!filter(variants[0].type)) return false;
  return isNullType(variants[1].type);
}
