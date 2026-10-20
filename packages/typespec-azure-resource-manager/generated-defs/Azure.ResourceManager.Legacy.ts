import type {
  DecoratorContext,
  DecoratorValidatorCallbacks,
  Enum,
  EnumMember,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Operation,
} from "@typespec/compiler";

/**
 * Options for customizing the behavior of a custom azure resource
 */
export interface CustomResourceOptions {
  /**
   * Should the resource be marked as an Azure resource
   */
  readonly isAzureResource?: boolean;
}

/**
 * Route options for an operation
 */
export interface ArmOperationOptions {
  /**
   * Should a static route be used
   */
  readonly useStaticRoute?: boolean;
  /**
   * The status route for operations to use
   */
  readonly route?: string;
}

/**
 * Options for defining a feature and the associated file
 */
export interface ArmFeatureOptions {
  /**
   * The feature name
   */
  readonly featureName: string;
  /**
   * The associated file name for the features
   */
  readonly fileName: string;
  /**
   * The feature description in Swagger
   */
  readonly description: string;
  /**
   * The feature title in Swagger
   */
  readonly title?: string;
  /**
   * The feature terms of service in Swagger
   */
  readonly termsOfService?: string;
}

/**
 * This decorator is used on resources that do not satisfy the definition of a resource
 * but need to be identified as such.
 *
 * @param options Options for customizing the behavior of the resource
 */
export type CustomAzureResourceDecorator = (
  context: DecoratorContext,
  target: Model,
  options?: CustomResourceOptions,
) => DecoratorValidatorCallbacks | void;

/**
 * Specify an external reference that should be used when emitting this type.
 *
 * @param jsonRef External reference(e.g. "../../common.json#/definitions/Foo")
 */
export type ExternalTypeRefDecorator = (
  context: DecoratorContext,
  entity: Model | ModelProperty,
  jsonRef: string,
) => DecoratorValidatorCallbacks | void;

/**
 * Signifies that an operation is an Azure Resource Manager operation
 * and optionally associates the operation with a route template.
 *
 * @param target The operation to associate the model with
 * @param route Optional route to associate with the operation
 */
export type ArmOperationRouteDecorator = (
  context: DecoratorContext,
  target: Operation,
  route?: ArmOperationOptions,
) => DecoratorValidatorCallbacks | void;

/**
 * Signifies that a Resource is represented using a library type in generated SDKs.
 *
 * @param target The model to that is an external resource
 */
export type ArmExternalTypeDecorator = (
  context: DecoratorContext,
  target: Model,
) => DecoratorValidatorCallbacks | void;

/**
 * Renames a path parameter in an Azure Resource Manager operation.
 *
 * @param target The operation or interface to modify
 * @param sourceParameterName The name of the parameter to rename
 * @param targetParameterName The new name for the parameter
 */
export type RenamePathParameterDecorator = (
  context: DecoratorContext,
  target: Operation,
  sourceParameterName: string,
  targetParameterName: string,
) => DecoratorValidatorCallbacks | void;

/**
 * Decorator to define a set of features
 *
 * @param target The service namespace
 * @param features The enum that contains the features
 */
export type FeaturesDecorator = (
  context: DecoratorContext,
  target: Namespace,
  features: Enum,
) => DecoratorValidatorCallbacks | void;

/**
 * Decorator to define options for a specific feature
 *
 * @param target The enum member that represents the feature
 * @param options The options for the feature
 */
export type FeatureOptionsDecorator = (
  context: DecoratorContext,
  target: EnumMember,
  options: ArmFeatureOptions,
) => DecoratorValidatorCallbacks | void;

/**
 * Decorator to associate a feature with a model, interface, or namespace
 *
 * @param target The target to associate the feature with
 * @param featureName The feature to associate with the target
 */
export type FeatureDecorator = (
  context: DecoratorContext,
  target: Model | Operation | Interface | Namespace,
  featureName: EnumMember,
) => DecoratorValidatorCallbacks | void;

export type AzureResourceManagerLegacyDecorators = {
  customAzureResource: CustomAzureResourceDecorator;
  externalTypeRef: ExternalTypeRefDecorator;
  armOperationRoute: ArmOperationRouteDecorator;
  armExternalType: ArmExternalTypeDecorator;
  renamePathParameter: RenamePathParameterDecorator;
  features: FeaturesDecorator;
  featureOptions: FeatureOptionsDecorator;
  feature: FeatureDecorator;
};
