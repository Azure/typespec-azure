// FIXME - This is a workaround for the circular dependency issue when loading
// createStateSymbol.
// Issue: https://github.com/microsoft/typespec/issues/2301
function azureResourceManagerCreateStateSymbol(name: string): symbol {
  return Symbol.for(`@azure-tools/typespec-azure-resource-manager.${name}`);
}

export const ArmStateKeys = {
  armProviderCache: azureResourceManagerCreateStateSymbol("armProviderCache"),
  armProviderNamespaces: azureResourceManagerCreateStateSymbol("armProviderNamespaces"),
  armResourceOperations: azureResourceManagerCreateStateSymbol("armResourceOperations"),
  armResourceCollectionAction: azureResourceManagerCreateStateSymbol("armResourceCollectionAction"),
  armResourceCollection: azureResourceManagerCreateStateSymbol("parameterBaseTypes"),
  armResources: azureResourceManagerCreateStateSymbol("armResources"),
  armLibraryNamespaces: azureResourceManagerCreateStateSymbol("armLibraryNamespaces"),
  usesArmLibraryNamespaces: azureResourceManagerCreateStateSymbol("usesArmLibraryNamespaces"),
  armCommonTypesVersion: azureResourceManagerCreateStateSymbol("armCommonTypesVersion"),
  armIdentifiers: azureResourceManagerCreateStateSymbol("armIdentifiers"),
  externalTypeRef: azureResourceManagerCreateStateSymbol("externalTypeRef"),

  // resource.ts
  armResourcesCached: azureResourceManagerCreateStateSymbol("armResourcesCached"),
  armSingletonResources: azureResourceManagerCreateStateSymbol("armSingletonResources"),
  resourceBaseType: azureResourceManagerCreateStateSymbol("resourceBaseTypeKey"),
  armBuiltInResource: azureResourceManagerCreateStateSymbol("armExternalResource"),
  customAzureResource: azureResourceManagerCreateStateSymbol("azureCustomResource"),

  // private.decorator.ts
  azureResourceBase: azureResourceManagerCreateStateSymbol("azureResourceBase"),
  armConditionalClientFlatten: azureResourceManagerCreateStateSymbol("armConditionalClientFlatten"),

  // commontypes.private.decorators.ts
  armCommonDefinitions: azureResourceManagerCreateStateSymbol("armCommonDefinitions"),
  armCommonParameters: azureResourceManagerCreateStateSymbol("armCommonParameters"),
  armCommonTypesVersions: azureResourceManagerCreateStateSymbol("armCommonTypesVersions"),
  armResourceRoute: azureResourceManagerCreateStateSymbol("armResourceRoute"),
};
