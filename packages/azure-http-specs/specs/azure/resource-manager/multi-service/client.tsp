import "./service1.tsp";
import "./service2.tsp";
import "@azure-tools/typespec-client-generator-core";

using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ClientGenerator.Core;

@client
@useDependency(Microsoft.Compute.Versions.v2025_04_01, Microsoft.ComputeDisk.Versions.v2025_01_02)
namespace Azure.ResourceManager.MultiService {
  @client({
    service: Microsoft.Compute,
    parent: Azure.ResourceManager.MultiService,
  })
  interface VitrualMachines extends Microsoft.Compute.VirtualMachines {}

  @client({
    service: Microsoft.ComputeDisk,
    parent: Azure.ResourceManager.MultiService,
  })
  interface Disks extends Microsoft.ComputeDisk.Disks {}
}
