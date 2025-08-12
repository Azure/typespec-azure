import { DecoratorContext, isArrayModelType, Model, ModelProperty, Type } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { UniqueItemsDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../lib.js";

export const $uniqueItems: UniqueItemsDecorator = (
  context: DecoratorContext,
  entity: ModelProperty | Model,
) => {
  const { program } = context;
  if (entity.kind === "ModelProperty") {
    if (entity.type.kind !== "Model" || !isArrayModelType(program, entity.type)) {
      reportDiagnostic(program, {
        code: "unique-items-invalid-type",
        target: entity,
      });
      return;
    }
    setUniqueItems(program, entity, true);
    return;
  }
  if (!isArrayModelType(program, entity)) {
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
