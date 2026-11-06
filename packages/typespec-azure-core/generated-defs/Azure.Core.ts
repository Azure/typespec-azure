import type {
  DecoratorContext,
  DecoratorValidatorCallbacks,
  Enum,
  EnumMember,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Type,
  Union,
  UnionVariant,
} from "@typespec/compiler";

/**
 * Used for custom StatusMonitor implementation.
 * Identifies an Enum or ModelProperty as containing long-running operation
 * status.
 */
export type LroStatusDecorator = (
  context: DecoratorContext,
  entity: Enum | Union | ModelProperty,
) => DecoratorValidatorCallbacks | void;

/**
 * Identifies a ModelProperty as containing the final location for the operation result.
 *
 * @param finalResult Sets the expected return value for the final result.  Overrides
 * any value provided in the decorated property, if the property uses ResourceLocation<Resource>.
 */
export type FinalLocationDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  finalResult?: Type,
) => DecoratorValidatorCallbacks | void;

/**
 * Identifies a model property as containing the location to poll for operation state.
 *
 * @param options PollingOptions for the poller pointed to by this link.  Overrides
 * settings derived from property value it is decorating, if the value of the
 * property is ResourceLocation<Resource>
 */
export type PollingLocationDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  options?: Type,
) => DecoratorValidatorCallbacks | void;

/**
 * Pairs named HTTP server endpoints with OAuth authentication configurations.
 *
 * Requires a `public` configuration, which is always the default regardless of declaration order. Calls `@server` for each configuration, with `public` first, and calls `@useAuth` once with the combined OR of authentication requirements. Existing AND groups and credential alternatives are preserved.
 *
 * The HTTP view exposes servers and auth alternatives independently. Azure Core metadata retains their pairing and the `public` default for SDK generation.
 *
 * Every configuration must include OAuth2, but OAuth flows, URLs, scopes, and authentication requirements may differ between configurations. Use ordinary HTTP authentication models. Do not combine this decorator with `@server` or `@useAuth` on the same namespace.
 *
 * OAuth URL metadata does not change a caller-owned credential's authority or tenant.
 *
 * @param target The namespace using these configurations.
 * @param configurations The named endpoint and authentication records.
 * @example
 * ```typespec
 * model PublicAuth is AadOauth2Auth<
 *   ["https://api.loganalytics.io/.default"],
 *   "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
 *   "https://login.microsoftonline.com/common/oauth2/v2.0/token"
 * >;
 * model GovernmentAuth is AadOauth2Auth<
 *   ["https://api.loganalytics.us/.default"],
 *   "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
 *   "https://login.microsoftonline.us/common/oauth2/v2.0/token"
 * >;
 *
 * model Configurations {
 *   public: {
 *     endpoint: "https://api.loganalytics.io";
 *     authentication: PublicAuth;
 *   };
 *   government: {
 *     endpoint: "https://api.loganalytics.us";
 *     authentication: GovernmentAuth;
 *   };
 * }
 *
 * @service
 * @azureServiceConfigurations(Configurations)
 * namespace Logs {
 *   @get op query(): string;
 * }
 * ```
 */
export type AzureServiceConfigurationsDecorator = (
  context: DecoratorContext,
  target: Namespace,
  configurations: Model,
) => DecoratorValidatorCallbacks | void;

/**
 * Decorator that marks a Version EnumMember as a preview version.
 * This is used to indicate that the version is not yet stable and may change in future releases.
 *
 * @param target The EnumMember that represents the preview version.
 * @example
 * ```typespec
 * @versioned(Versions)
 * @service(#{ title: "Widget Service" })
 * namespace DemoService;
 *
 * enum Versions {
 *   v1,
 *   v2,
 *   @previewVersion
 *   v3Preview
 * }
 * ```
 */
export type PreviewVersionDecorator = (
  context: DecoratorContext,
  target: EnumMember,
) => DecoratorValidatorCallbacks | void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies an EnumMember as a long-running "Succeeded" terminal state.
 */
export type LroSucceededDecorator = (
  context: DecoratorContext,
  entity: EnumMember | UnionVariant,
) => DecoratorValidatorCallbacks | void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies an EnumMember as a long-running "Canceled" terminal state.
 */
export type LroCanceledDecorator = (
  context: DecoratorContext,
  entity: EnumMember | UnionVariant,
) => DecoratorValidatorCallbacks | void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies an enum member as a long-running "Failed" terminal state.
 */
export type LroFailedDecorator = (
  context: DecoratorContext,
  entity: EnumMember | UnionVariant,
) => DecoratorValidatorCallbacks | void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies a model property of a StatusMonitor as containing the result
 * of a long-running operation that terminates successfully (Succeeded).
 */
export type LroResultDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
) => DecoratorValidatorCallbacks | void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies a model property of a StatusMonitor as containing the result
 * of a long-running operation that terminates unsuccessfully (Failed).
 */
export type LroErrorResultDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
) => DecoratorValidatorCallbacks | void;

/**
 * Identifies an operation that is linked to the target operation.
 *
 * @param linkedOperation The linked Operation
 * @param linkType A string indicating the role of the linked operation
 * @param parameters Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will
 * be passed to the linked operation request.
 */
export type OperationLinkDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  linkType: string,
  parameters?: Type,
) => DecoratorValidatorCallbacks | void;

/**
 * Used to define how to call custom polling operations for long-running operations.
 *
 * @param targetParameter A reference to the polling operation parameter this parameter
 * provides a value for, or the name of that parameter. The default value is the name of
 * the decorated parameter or property.
 */
export type PollingOperationParameterDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  targetParameter?: Type,
) => DecoratorValidatorCallbacks | void;

/**
 * Identifies that an operation is a polling operation for an LRO.
 *
 * @param linkedOperation The linked Operation
 * @param parameters Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will
 * be passed to the linked operation request.
 */
export type PollingOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => DecoratorValidatorCallbacks | void;

/**
 * Identifies that an operation is the final operation for an LRO.
 *
 * @param linkedOperation The linked Operation
 * @param parameters Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will
 * be passed to the linked operation request.
 */
export type FinalOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => DecoratorValidatorCallbacks | void;

/**
 * Overrides the final state value for an operation
 *
 * @param finalState The desired final state value
 */
export type UseFinalStateViaDecorator = (
  context: DecoratorContext,
  entity: Operation,
  finalState: "original-uri" | "operation-location" | "location" | "azure-async-operation",
) => DecoratorValidatorCallbacks | void;

/**
 * Specifies that an array model or array-typed property should contain only unique items.
 */
export type UniqueItemsDecorator = (
  context: DecoratorContext,
  entity: ModelProperty | Model,
) => DecoratorValidatorCallbacks | void;

export type AzureCoreDecorators = {
  lroStatus: LroStatusDecorator;
  finalLocation: FinalLocationDecorator;
  pollingLocation: PollingLocationDecorator;
  azureServiceConfigurations: AzureServiceConfigurationsDecorator;
  previewVersion: PreviewVersionDecorator;
  lroSucceeded: LroSucceededDecorator;
  lroCanceled: LroCanceledDecorator;
  lroFailed: LroFailedDecorator;
  lroResult: LroResultDecorator;
  lroErrorResult: LroErrorResultDecorator;
  operationLink: OperationLinkDecorator;
  pollingOperationParameter: PollingOperationParameterDecorator;
  pollingOperation: PollingOperationDecorator;
  finalOperation: FinalOperationDecorator;
  useFinalStateVia: UseFinalStateViaDecorator;
  uniqueItems: UniqueItemsDecorator;
};
