import type {
  DecoratorContext,
  DecoratorValidatorCallbacks,
  ModelProperty,
} from "@typespec/compiler";

/**
 * Marks a model property (or operation parameter) as required for this emulator, even when the
 * base service TypeSpec declares it optional.
 *
 * This is an **emulator-contract** decorator, not a client-customization decorator: it mutates
 * the same `@typespec/http` operation/model graph that this emitter (and any other
 * service-contract-level emitter or linter) walks, so the tightened requiredness is visible to
 * every consumer of the compiled program - not just one SDK language's generated client, the way
 * `@typespec/client-generator-core`'s `@override` would be (that decorator only changes what a
 * client SDK's generated method signature looks like; it never touches the real HTTP
 * operation/model types themselves, so a `@typespec/http`-level emitter like this one - or any
 * future real Azurite emitter - would never see its effect).
 *
 * Use this from an `azurite.tsp` overlay to express "the real service accepts this parameter as
 * optional, but the emulator's implementation requires it" without editing the shared, unowned
 * base service TypeSpec.
 *
 * @param target The model property or operation parameter to make required.
 */
export type MakeRequiredDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
) => DecoratorValidatorCallbacks | void;

export type AzuriteDecorators = {
  makeRequired: MakeRequiredDecorator;
};
