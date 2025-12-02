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
  service: Service.MultiService.ServiceA,
})
@useDependency(
  Service.MultiService.ServiceA.VersionsA.av2,
  Service.MultiService.ServiceB.VersionsB.bv2
)
namespace Service.MultiService.Combined {
  @client({
    service: Service.MultiService.ServiceA,
    parent: Service.MultiService.Combined,
  })
  @scenario
  @scenarioDoc("""
      Test operation aTest from ServiceA.
      
      Call this operation with apiVersion set to `av2`.
    """)
  interface FirstService extends Service.MultiService.ServiceA.AI {}

  @client({
    service: Service.MultiService.ServiceB,
    parent: Service.MultiService.Combined,
  })
  @scenario
  @scenarioDoc("""
      Test operation bTest from ServiceB.
    
      Call this operation with apiVersion set to `bv2`.
    """)
  interface SecondService extends Service.MultiService.ServiceB.BI {}
}
