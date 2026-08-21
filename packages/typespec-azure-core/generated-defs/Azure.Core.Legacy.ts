import type {
  DecoratorContext,
  DecoratorValidatorCallbacks,
  Interface,
  Namespace,
} from "@typespec/compiler";

/**
 * Overrides the API-version wire value used for operations within a namespace or interface.
 *
 * The value is opaque and does not need to be declared by the service version enum. The override
 * is inherited by enclosed namespaces, interfaces, and operations, with the nearest override taking
 * precedence.
 *
 * This decorator is considered legacy functionality and should only be used to preserve
 * compatibility with an existing SDK.
 *
 * @param target The namespace or interface whose operations use the API-version override.
 * @param version The non-empty API-version wire value.
 * @param scope The language emitters to which the override applies.
 * @example Override an interface API version
 * ```typespec
 * @Azure.Core.Legacy.overrideApiVersion("2021-11-01")
 * interface Widgets {
 *   get(): void;
 * }
 * ```
 */
export type OverrideApiVersionDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  version: string,
  scope?: string,
) => DecoratorValidatorCallbacks | void;

export type AzureCoreLegacyDecorators = {
  overrideApiVersion: OverrideApiVersionDecorator;
};
