import type {
  DecoratorContext,
  Interface,
  Model,
  ModelProperty,
  Operation,
} from "@typespec/compiler";

export interface ArmRouteOptions {
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
 * Signifies that an interface contains resource operations
 * and optionally associates the operations with a route template.
 *
 * @param target The interface to associate the model with
 * @param routeOptions Optional route to associate with the interface
 */
export type ArmResourceRouteDecorator = (
  context: DecoratorContext,
  target: Interface,
  routeOptions?: ArmRouteOptions,
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
  route?: ArmRouteOptions,
) => void;

export type AzureResourceManagerLegacyDecorators = {
  customAzureResource: CustomAzureResourceDecorator;
  externalTypeRef: ExternalTypeRefDecorator;
  armResourceRoute: ArmResourceRouteDecorator;
  armOperationRoute: ArmOperationRouteDecorator;
};
