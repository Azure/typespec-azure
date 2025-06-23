import type { DecoratorContext, Model } from "@typespec/compiler";

/**
 * `@builtInResource` marks a model as built-in to Azure ResourceManager
 *
 * @param target The model that is marked as built-in.
 */
export type BuiltInResourceDecorator = (context: DecoratorContext, target: Model) => void;

export type AzureResourceManagerExtensionPrivateDecorators = {
  builtInResource: BuiltInResourceDecorator;
};
