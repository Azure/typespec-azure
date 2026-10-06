import type { Operation, Program } from "@typespec/compiler";
import type {
  DispatchPatternDecorator,
  MakeOptionalDecorator,
  OperationEnumNameDecorator,
} from "../generated-defs/Azurite.js";
import { createStateSymbol } from "./lib.js";

const operationEnumNameKey = createStateSymbol("operationEnumName");
const dispatchPatternKey = createStateSymbol("dispatchPattern");

/** Implements `@makeOptional` for Azurite overlays. */
export const $makeOptional: MakeOptionalDecorator = (context, target) => {
  target.optional = true;
};

/** Implements `@operationEnumName` for Azurite overlays. */
export const $operationEnumName: OperationEnumNameDecorator = (context, target, name) => {
  context.program.stateMap(operationEnumNameKey).set(target, name);
};

/** Implements `@dispatchPattern` for Azurite overlays. */
export const $dispatchPattern: DispatchPatternDecorator = (context, target, pattern) => {
  context.program.stateMap(dispatchPatternKey).set(target, pattern);
};

export function getOperationEnumName(program: Program, target: Operation): string | undefined {
  return program.stateMap(operationEnumNameKey).get(target);
}

export function getDispatchPattern(program: Program, target: Operation): string | undefined {
  return program.stateMap(dispatchPatternKey).get(target);
}

/** @internal */
export const $decorators = {
  Azurite: {
    dispatchPattern: $dispatchPattern,
    makeOptional: $makeOptional,
    operationEnumName: $operationEnumName,
  },
};
