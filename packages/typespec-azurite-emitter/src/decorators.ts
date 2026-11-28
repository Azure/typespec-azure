import type { ModelProperty, Program } from "@typespec/compiler";
import type { MakeOptionalDecorator } from "../generated-defs/Azurite.js";
import { $lib } from "./lib.js";

/** Implements `@makeOptional` for Azurite overlays. */
export const $makeOptional: MakeOptionalDecorator = (context, target) => {
  context.program.stateSet($lib.stateKeys.optional).add(target);
};

export function isOptional(program: Program, property: ModelProperty): boolean {
  const optional = program.stateSet($lib.stateKeys.optional);
  for (let p: ModelProperty | undefined = property; p; p = p.sourceProperty) {
    if (optional.has(p)) return true;
  }
  return property.optional;
}

/** @internal */
export const $decorators = {
  Azurite: {
    makeOptional: $makeOptional,
  },
};
