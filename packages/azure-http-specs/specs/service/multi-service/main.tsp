import "@typespec/versioning";
import "@typespec/http";
import "@typespec/spector";

using Versioning;
using Http;
using Spector;

namespace Service.MultiService;

/*
 * First service definition in a multi-service package with versioning
 */
@scenarioService("/service/multi-service/service-a")
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    av1,
    av2,
  }

  interface AI {
    @scenario
    @scenarioDoc("""
        Test that a client can expose operations from multiple services. This operaton should be called like this: `client.ai.aTest(...)`.
      
        Expected path: /service/multi-service/service-a/aTest
        Expected query parameter: api-version=av2
        Expected 204 response.
      """)
    @route("/aTest")
    aTest(@query("api-version") apiVersion: VersionsA): void;
  }
}

/**
 * Second service definition in a multi-service package with versioning
 */
@scenarioService("/service/multi-service/service-b")
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB {
    bv1,
    bv2,
  }

  interface BI {
    @scenario
    @scenarioDoc("""
        Test that a client can expose operations from multiple services. This operaton should be called like this: `client.bi.bTest(...)`.
      
        Expected path: /service/multi-service/service-b/bTest
        Expected query parameter: api-version=bv2
        Expected 204 response.
      """)
    @route("/bTest")
    bTest(@query("api-version") apiVersion: VersionsB): void;
  }
}
