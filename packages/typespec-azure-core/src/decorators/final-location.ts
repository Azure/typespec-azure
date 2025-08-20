import {
  isNeverType,
  isVoidType,
  type DecoratorContext,
  type IntrinsicType,
  type Model,
  type ModelProperty,
  type Type,
} from "@typespec/compiler";
import { useStateMap, useStateSet } from "@typespec/compiler/utils";
import type { FinalLocationDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys } from "../lib.js";

export const [getFinalLocationValue, setFinalLocationValue] = useStateMap<
  ModelProperty,
  Model | IntrinsicType
>(AzureCoreStateKeys.finalLocationResults);

export const [
  /**
   *  Returns `true` if the property is marked with @finalLocation.
   */
  isFinalLocation,
  markFinalLocationProperty,
] = useStateSet<ModelProperty>(AzureCoreStateKeys.finalLocationResults);

export const $finalLocation: FinalLocationDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  finalResult?: Type,
) => {
  const { program } = context;
  if (finalResult !== undefined && isNeverType(finalResult)) return;
  markFinalLocationProperty(program, entity);
  switch (finalResult?.kind) {
    case "Model":
      setFinalLocationValue(program, entity, finalResult);
      break;
    case "Intrinsic":
      if (isVoidType(finalResult)) {
        setFinalLocationValue(program, entity, finalResult);
      }
  }
};
