import type { DecoratorContext, ModelProperty, Type } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { PollingOperationParameterDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys } from "../lib.js";

export const [getPollingOperationParameter, setPollingOperationParameter] = useStateMap<
  ModelProperty,
  ModelProperty | string | undefined
>(AzureCoreStateKeys.pollingOperationParameter);

export const $pollingOperationParameter: PollingOperationParameterDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  target?: Type,
) => {
  const { program } = context;
  let storedValue: ModelProperty | string | undefined;
  switch (target?.kind) {
    case "ModelProperty":
      storedValue = target;
      break;
    case "String":
      storedValue = target.value;
      break;
    default:
      storedValue = undefined;
  }
  setPollingOperationParameter(program, entity, storedValue ?? entity.name);
};
