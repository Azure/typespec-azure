using Reflection;

namespace Azure.ResourceManager;

/**
 * `@armProviderNamespace` sets the Azure Resource Manager provider name. It will default to use the
 * Namespace element value unless an override value is specified.
 *
 * @example
 *
 * ```typespec
 * @armProviderNamespace
 *  namespace Microsoft.Contoso;
 * ```
 *
 * ```typespec
 * @armProviderNamespace("Microsoft.Contoso")
 *  namespace Microsoft.ContosoService;
 * ```
 *
 * @param providerNamespace Provider namespace
 *
 */
extern dec armProviderNamespace(target: Namespace, providerNamespace?: valueof string);

/**
 * Declare the Azure Resource Manager library namespaces used in this provider.
 * This allows sharing Azure Resource Manager resource types across specifications
 * @param namespaces The namespaces of Azure Resource Manager libraries used in this provider
 */
extern dec useLibraryNamespace(target: Namespace, ...namespaces: Namespace[]);

/**
 * `@armLibraryNamespace` designates a namespace as containing Azure Resource Manager Provider information.
 * This is used for library namespaces that define reusable ARM resource types that can be shared
 * across multiple provider specifications.
 *
 * @example
 *
 * ```typespec
 * @armLibraryNamespace
 *  namespace Microsoft.Contoso;
 * ```
 *
 */
extern dec armLibraryNamespace(target: Namespace);

/**
 * `@singleton` marks an Azure Resource Manager resource model as a singleton resource.
 *
 * Singleton resources only have a single instance with a fixed key name.
 *  `.../providers/Microsoft.Contoso/monthlyReports/default`
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 *
 * @param keyValue The name of the singleton resource. Default name is "default".
 */
extern dec singleton(target: Model, keyValue?: valueof string | "default");

/**
 * `@tenantResource` marks an Azure Resource Manager resource model as a Tenant resource/Root resource/Top-Level resource.
 *
 * Tenant resources have REST API paths like:
 *   `/provider/Microsoft.Contoso/FooResources`
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 */
extern dec tenantResource(target: Model);

/**
 * `@subscriptionResource` marks an Azure Resource Manager resource model as a subscription resource.
 *
 * Subscription resources have REST API paths like:
 *  `/subscription/{id}/providers/Microsoft.Contoso/employees`
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 */
extern dec subscriptionResource(target: Model);

/**
 * `@locationResource` marks an Azure Resource Manager resource model as a location based resource.
 *
 * **Deprecated**: This decorator is deprecated. Use `@parentResource` with `ArmLocationResource` instead.
 * See the [Location Resource sample](https://azure.github.io/typespec-azure/docs/samples/resource-manager/resource-types/location/)
 * for the recommended approach.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 */
extern dec locationResource(target: Model);

/**
 * `@resourceGroupResource` marks an Azure Resource Manager resource model as a resource group level resource.
 * This is the default option for Azure Resource Manager resources. It is provided for symmetry and clarity, and
 * you typically do not need to specify it.
 *
 *   `/subscription/{id}/resourcegroups/{rg}/providers/Microsoft.Contoso/employees`
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 */
extern dec resourceGroupResource(target: Model);

/**
 * `@extensionResource` marks an Azure Resource Manager resource model as an Extension resource.
 * Extension resource extends other resource types. URL path is appended
 * to another segment {scope} which refers to another Resource URL.
 *
 *   `{resourceUri}/providers/Microsoft.Contoso/accessPermissions`
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 */
extern dec extensionResource(target: Model);

/**
 * `@armProviderNameValue` sets the provider namespace value on operations.
 * It is used internally to inject the correct provider namespace path segment
 * for resource operations in auto-generated routes.
 */
extern dec armProviderNameValue(target: Operation);

/**
 * Marks the operation as being a collection action that is not associated with a specific resource instance.
 * Collection actions are operations that act on a resource collection rather than a single resource,
 * such as `checkNameAvailability` or provider-level actions.
 */
extern dec armResourceCollectionAction(target: Operation);

/**
 * Marks the operation as a custom action on a specific Azure Resource Manager resource type.
 * This decorator associates a POST action operation with its resource,
 * identifying the semantics of the operation as a resource action over a specific resource for documentation,
 * resource validation, and use by downstream emitters.
 *
 * @param resourceModel Resource model
 * @param resourceName Optional. The name of the resource. If not provided, the name of the resource model will be used.
 */
extern dec armResourceAction(
  target: Operation,
  resourceModel: Model,
  resourceName?: valueof string
);

/**
 * Marks the operation as a create or update (PUT) operation for a specific Azure Resource Manager resource type.
 * This decorator identifies the semantics of the operation as a CreateOrReplace lifecycle operation over a particular resource,
 * for use in documentation, resource validation, and downstream emitters.
 *
 * @param resourceModel Resource model
 * @param resourceName Optional. The name of the resource. If not provided, the name of the resource model will be used.
 */
extern dec armResourceCreateOrUpdate(
  target: Operation,
  resourceModel: Model,
  resourceName?: valueof string
);

/**
 * Marks the operation as a read (GET) operation for a specific Azure Resource Manager resource type.
 * This decorator identifies the semantics of the operation as a Read lifecycle operation over a particular resource,
 * for use in documentation, resource validation, and downstream emitters.
 *
 * @param resourceModel Resource model
 * @param resourceName Optional. The name of the resource. If not provided, the name of the resource model will be used.
 */
extern dec armResourceRead(target: Operation, resourceModel: Model, resourceName?: valueof string);

/**
 * Marks the operation as an update (PATCH) operation for a specific Azure Resource Manager resource type.
 * This decorator identifies the operation as an Update lifecycle operation over the resource for use in documentation,
 * resource validation, and downstream emitters.
 *
 * @param resourceModel Resource model
 * @param resourceName Optional. The name of the resource. If not provided, the name of the resource model will be used.
 */
extern dec armResourceUpdate(
  target: Operation,
  resourceModel: Model,
  resourceName?: valueof string
);

/**
 * Marks the operation as a delete (DELETE) operation for a specific Azure Resource Manager resource type.
 * This decorator identifies the operation as a Delete lifecycle operation over the resource for us in documentation,
 * resource validation, and downstream emitters.
 *
 * @param resourceModel Resource model
 * @param resourceName Optional. The name of the resource. If not provided, the name of the resource model will be used.
 */
extern dec armResourceDelete(
  target: Operation,
  resourceModel: Model,
  resourceName?: valueof string
);

/**
 * Marks the operation as a list (GET collection) operation for a specific Azure Resource Manager resource type.
 * This decorator identifies the semantics of the operation as a collection list operation over a resource type and a particular scope for documentation,
 * resource validation, and downstream emitters.
 *
 * @param resourceModel Resource model
 * @param resourceName Optional. The name of the resource. If not provided, the name of the resource model will be used.
 */
extern dec armResourceList(target: Operation, resourceModel: Model, resourceName?: valueof string);

/**
 * Marks the operation as being a check existence (HEAD) operation
 * @param resourceModel Resource model
 * @param resourceName Optional. The name of the resource. If not provided, the name of the resource model will be used.
 */
extern dec armResourceCheckExistence(
  target: Operation,
  resourceModel: Model,
  resourceName?: valueof string
);

/**
 * This decorator is used to identify interfaces containing resource operations.
 * By default, it marks the interface with the `@autoRoute` decorator so that
 * all of its contained operations will have their routes generated
 * automatically.
 *
 * The decorator also adds a `@tag` decorator bearing the name of the interface so that all
 * of the operations will be grouped based on the interface name in generated
 * clients.
 *
 * The optional `resourceOperationOptions` parameter provides additional options.
 * `allowStaticRoutes` turns off autoRout for the interface, so individual operations can
 * choose static (`@route`) or automatic (`@autoRoute`) routing.
 *
 * `resourceType: Model` specifies the resource type for the operations in the interface
 *
 * `omitTags: true`: turns off the default tagging of operations in the interface, so that individual operations must be
 * individually tagged
 *
 *
 * @param resourceOperationOptions Options for routing the operations in the interface and associating them with a specific resource
 */
extern dec armResourceOperations(
  target: Interface,
  resourceOperationOptions?: (valueof ResourceOperationOptions) | unknown
);

/** Interface-level operation options */
model ResourceOperationOptions {
  /**
   * The resource type for the operations in the interface
   */
  resourceType?: Model;

  /**
   * If true, turns off autoRoute for the interface, so individual operations can choose static (`@route`) or automatic (`@autoRoute`) routing.
   */
  allowStaticRoutes?: boolean;

  /**
   * If true, turns off the default tagging of operations in the interface, so that individual operations must be individually tagged
   */
  omitTags?: boolean;
}

/**
 * This decorator is used either on a namespace or a version enum value to indicate
 * the version of the Azure Resource Manager common-types to use for refs in emitted Swagger files.
 *
 * @param version The Azure.ResourceManager.CommonTypes.Versions for the desired common-types version or an equivalent string value like "v5".
 */
extern dec armCommonTypesVersion(
  target: Namespace | EnumMember,
  version: valueof string | EnumMember
);

/**
 * This decorator is used on Azure Resource Manager resources that are not based on
 * Azure.ResourceManager common types. It marks a model as an ARM virtual resource,
 * which is useful for scope resources like `ArmLocationResource` or action scope models.
 *
 * @param provider Optional. The resource provider namespace for the virtual resource.
 */
extern dec armVirtualResource(target: Model, provider?: valueof string);

/**
 * This decorator sets the base type of the given resource, indicating where in the
 * Azure Resource Manager hierarchy the resource is located.
 *
 * @param baseType The built-in parent of the resource, this can be "Tenant", "Subscription", "ResourceGroup", "Location", or "Extension"
 */
extern dec resourceBaseType(
  target: Model,
  baseType: "Tenant" | "Subscription" | "ResourceGroup" | "Location" | "Extension"
);

/**
 * This decorator is used to indicate the identifying properties of objects in the array, e.g. size
 * The properties that are used as identifiers for the object needs to be provided as a list of strings.
 *
 * @param properties The list of properties that are used as identifiers for the object. This needs to be provided as a list of strings.
 *
 * @example
 * ```typespec
 * model Pet {
 *  @identifiers(#["size"])
 *  dog: Dog;
 * }
 * ```
 */
extern dec identifiers(entity: ModelProperty | Array<unknown>, properties: valueof string[]);
