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
@useDependency(Microsoft.Compute.Versions.v2025_04_01, Microsoft.ComputeDisk.Versions.v2025_01_02)
namespace Azure.ResourceManager.MultiService;
