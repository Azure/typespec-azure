import type { MakeOptionalDecorator } from "../generated-defs/Azurite.js";

/** Implements `@makeOptional` for Azurite overlays. */
export const $makeOptional: MakeOptionalDecorator = (context, target) => {
  target.optional = true;
};

/** @internal */
export const $decorators = {
  Azurite: {
    makeOptional: $makeOptional,
  },
};
