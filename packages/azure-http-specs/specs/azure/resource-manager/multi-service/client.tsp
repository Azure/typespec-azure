import "./service1.tsp";
import "./service2.tsp";
import "@azure-tools/typespec-client-generator-core";

using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ClientGenerator.Core;

@client({
  service: [Microsoft.Compute, Microsoft.ComputeDisk],
})
namespace Azure.ResourceManager.MultiService;
