import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "./main.tsp";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@TypeSpec.Versioning.useDependency(_Specs_.Azure.Example.Unified.Versions.v2022_12_01_preview)
@route("/azure/example/unified")
namespace AzureExampleUnifiedClient;

@@clientNamespace(AzureExampleUnifiedClient, "azure.example.unified", "java");
@@clientNamespace(_Specs_.Azure.Example.Unified, "azure.example.unified", "java");

@client({
  name: "AzureExampleClient",
  service: _Specs_.Azure.Example.Unified,
})
interface AzureExampleClient {
  basicAction is _Specs_.Azure.Example.Unified.ServiceOperationGroup.basic;
}
