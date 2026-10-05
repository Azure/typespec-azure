import type { MakeRequiredDecorator } from "../generated-defs/Azurite.js";

/**
 * Implementation of the `@makeRequired` decorator (see `lib/decorators.tsp` for the full design
 * rationale on why this exists as its own emulator-contract decorator rather than reusing
 * `@typespec/client-generator-core`'s `@override`).
 *
 * Mirrors `@typespec/compiler`'s own stdlib precedent for mutating a property's `optional` flag
 * from within a decorator: `$withOptionalProperties` (in `@typespec/compiler`'s
 * `src/lib/decorators.ts`) does the same kind of direct mutation, just in the opposite direction
 * (forcing every property of a model optional). There is no stdlib decorator for the reverse
 * (forcing a single property required), which is exactly the gap this decorator fills for
 * emulator overlay authors.
 *
 * The decorator's signature type (`MakeRequiredDecorator`) is generated from `lib/decorators.tsp`
 * by `pnpm gen-extern-signature` (`@typespec/tspd`'s `gen-extern-signature` command, the same
 * tool `@typespec/client-generator-core` uses) rather than hand-written, so the TypeScript
 * implementation can never drift out of sync with the `extern dec` declaration.
 */
export const $makeRequired: MakeRequiredDecorator = (context, target) => {
  target.optional = false;
};

/** @internal */
export const $decorators = {
  Azurite: {
    makeRequired: $makeRequired,
  },
};
