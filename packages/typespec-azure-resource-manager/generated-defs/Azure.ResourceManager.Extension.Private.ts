import type { DecoratorContext, Model } from "@typespec/compiler";

/**
 * `@builtInResource` marks a model as built-in to Azure ResourceManager at the tenant level
 *
 * @param target The model that is marked as built-in.
 */
export type BuiltInResourceDecorator = (context: DecoratorContext, target: Model) => void;

/**
 * `@builtInResource` marks a model as built-in to Azure ResourceManager at the Subscription level
 *
 * @param target The model that is marked as built-in.
 */
export type BuiltInSubscriptionResourceDecorator = (
  context: DecoratorContext,
  target: Model,
) => void;

/**
 * `@builtInResource` marks a model as built-in to Azure ResourceManager at the ResourceGroup level
 *
 * @param target The model that is marked as built-in.
 */
export type BuiltInResourceGroupResourceDecorator = (
  context: DecoratorContext,
  target: Model,
) => void;

export type AzureResourceManagerExtensionPrivateDecorators = {
  builtInResource: BuiltInResourceDecorator;
  builtInSubscriptionResource: BuiltInSubscriptionResourceDecorator;
  builtInResourceGroupResource: BuiltInResourceGroupResourceDecorator;
};
