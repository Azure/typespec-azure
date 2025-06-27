using Reflection;

namespace Azure.ResourceManager.Legacy;

/**
 * Route options for an interface
 */
model ArmRouteOptions {
  /** Should a static route be used */
  useStaticRoute?: boolean;

  /** The status route for operations to use */
  route?: string;
}
/**
 * This decorator is used on resources that do not satisfy the definition of a resource
 * but need to be identified as such.
 */
extern dec customAzureResource(target: Model);

/**
 * Specify an external reference that should be used when emitting this type.
 * @param jsonRef - External reference(e.g. "../../common.json#/definitions/Foo")
 */
extern dec externalTypeRef(entity: Model | ModelProperty, jsonRef: valueof string);

/** Signifies that an interface contains resource operations
 * and optionally associates the operations with a route template.
 * @param target The interface to associate the model with
 * @param routeOptions Optional route to associate with the interface
 */
extern dec armResourceRoute(target: Interface, routeOptions?: valueof ArmRouteOptions);

/**
 * Signifies that an operation is an Azure Resource Manager operation
 * and optionally associates the operation with a route template.
 * @param target The operation to associate the model with
 * @param route Optional route to associate with the operation
 */
extern dec armOperationRoute(target: Operation, route?: valueof ArmRouteOptions);
