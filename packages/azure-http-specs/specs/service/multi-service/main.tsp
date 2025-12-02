import "@typespec/versioning";
import "@typespec/http";
import "@typespec/spector";
using Versioning;
using Http;
using Spector;

namespace Service.MultiService;

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
@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    av1,
    av2,
  }

  interface AI {
    @route("/aTest")
    aTest(@query("api-version") apiVersion: VersionsA): void;
  }
}

@service
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB {
    bv1,
    bv2,
  }

  interface BI {
    @route("/bTest")
    bTest(@query("api-version") apiVersion: VersionsB): void;
  }
}
