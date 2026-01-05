import "./service1.tsp";
import "./service2.tsp";
import "@azure-tools/typespec-client-generator-core";

using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ClientGenerator.Core;

@client({
  service: [
    Azure.ResourceManager.MultiServiceOlderVersions.Compute,
    Azure.ResourceManager.MultiServiceOlderVersions.ComputeDisk
  ],
  version: [
    Azure.ResourceManager.MultiServiceOlderVersions.Compute.Versions.v2024_11_01,
    Azure.ResourceManager.MultiServiceOlderVersions.ComputeDisk.Versions.v2024_03_02
  ],
})
namespace Azure.ResourceManager.MultiServiceOlderVersions.Combined;
