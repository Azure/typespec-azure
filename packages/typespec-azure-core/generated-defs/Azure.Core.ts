import type {
  DecoratorContext,
  Enum,
  EnumMember,
  Model,
  ModelProperty,
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
) => void;

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
) => void;

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
) => void;

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
export type PreviewVersionDecorator = (context: DecoratorContext, target: EnumMember) => void;

/**
 * Marks a Model as a paged collection.
 */
export type PagedResultDecorator = (context: DecoratorContext, entity: Model) => void;

/**
 * Identifies the ModelProperty that contains the paged items. Can only be used on a Model marked with `@pagedResult`.
 */
export type ItemsDecorator = (context: DecoratorContext, entity: ModelProperty) => void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies an EnumMember as a long-running "Succeeded" terminal state.
 */
export type LroSucceededDecorator = (
  context: DecoratorContext,
  entity: EnumMember | UnionVariant,
) => void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies an EnumMember as a long-running "Canceled" terminal state.
 */
export type LroCanceledDecorator = (
  context: DecoratorContext,
  entity: EnumMember | UnionVariant,
) => void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies an enum member as a long-running "Failed" terminal state.
 */
export type LroFailedDecorator = (
  context: DecoratorContext,
  entity: EnumMember | UnionVariant,
) => void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies a model property of a StatusMonitor as containing the result
 * of a long-running operation that terminates successfully (Succeeded).
 */
export type LroResultDecorator = (context: DecoratorContext, entity: ModelProperty) => void;

/**
 * Used for custom StatusMonitor implementation.
 * Identifies a model property of a StatusMonitor as containing the result
 * of a long-running operation that terminates unsuccessfully (Failed).
 */
export type LroErrorResultDecorator = (context: DecoratorContext, entity: ModelProperty) => void;

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
) => void;

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
) => void;

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
) => void;

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
) => void;

/**
 * Overrides the final state value for an operation
 *
 * @param finalState The desired final state value
 */
export type UseFinalStateViaDecorator = (
  context: DecoratorContext,
  entity: Operation,
  finalState: "original-uri" | "operation-location" | "location" | "azure-async-operation",
) => void;

/**
 * Identifies that an operation is used to retrieve the next page for paged operations.
 *
 * @param linkedOperation The linked Operation
 * @param parameters Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will
 * be passed to the linked operation request.
 */
export type NextPageOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => void;

export type AzureCoreDecorators = {
  lroStatus: LroStatusDecorator;
  finalLocation: FinalLocationDecorator;
  pollingLocation: PollingLocationDecorator;
  previewVersion: PreviewVersionDecorator;
  pagedResult: PagedResultDecorator;
  items: ItemsDecorator;
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
  nextPageOperation: NextPageOperationDecorator;
};
