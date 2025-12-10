import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/http";
import "@typespec/versioning";

using Azure.ClientGenerator.Core;
using Spector;
using Versioning;

@scenarioDoc("""
    Test that a client can expose operations from multiple services.
    This scenario demonstrates creating a unified client that provides access to 
    operations from different services using the @client decorator.
    
    ```ts
    const client = new MultiServiceClient();
    
    // Call operation from first service - uses api-version av2
    client.aTest();
  
    // Call operation from second service - uses api-version bv2
    client.bTest();
    ```
  """)
@client({
  service: [Service.MultiService.ServiceA, Service.MultiService.ServiceB],
})
@useDependency(
  Service.MultiService.ServiceA.VersionsA.av2,
  Service.MultiService.ServiceB.VersionsB.bv2
)
namespace Service.MultiService.Combined;
