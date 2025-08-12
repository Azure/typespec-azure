import type { DecoratorContext, Model, ModelProperty, Operation } from "@typespec/compiler";

export interface ArmOperationOptions {
  readonly useStaticRoute?: boolean;
  readonly route?: string;
}

/**
 * This decorator is used on resources that do not satisfy the definition of a resource
 * but need to be identified as such.
 */
export type CustomAzureResourceDecorator = (context: DecoratorContext, target: Model) => void;

/**
 * Specify an external reference that should be used when emitting this type.
 *
 * @param jsonRef External reference(e.g. "../../common.json#/definitions/Foo")
 */
export type ExternalTypeRefDecorator = (
  context: DecoratorContext,
  entity: Model | ModelProperty,
  jsonRef: string,
) => void;

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
) => void;

export type AzureResourceManagerLegacyDecorators = {
  customAzureResource: CustomAzureResourceDecorator;
  externalTypeRef: ExternalTypeRefDecorator;
  armOperationRoute: ArmOperationRouteDecorator;
};
