import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

namespace {{parameters.ServiceNamespace}};

interface Operations extends Azure.ResourceManager.Operations {}
