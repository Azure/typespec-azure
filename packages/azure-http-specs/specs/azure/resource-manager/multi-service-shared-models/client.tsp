import "./service1.tsp";
import "./service2.tsp";
import "@azure-tools/typespec-client-generator-core";

using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ClientGenerator.Core;

@client({
  service: [
    Azure.ResourceManager.MultiServiceSharedModels.Compute,
    Azure.ResourceManager.MultiServiceSharedModels.Storage
  ],
})
namespace Azure.ResourceManager.MultiServiceSharedModels.Combined;
