import "@typespec/versioning";
import "@typespec/http";
import "@typespec/spector";
using Versioning;
using Http;

namespace Service.MultiService;

/*
 * First service definition in a multi-service package with versioning
 */
@service
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    av1,
    av2,
  }

  interface AI {
    /**
     * Test operation aTest from ServiceA.
     */
    @route("/aTest")
    aTest(@query("api-version") apiVersion: VersionsA): void;
  }
}

/**
 * Second service definition in a multi-service package with versioning
 */
@service
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB {
    bv1,
    bv2,
  }

  interface BI {
    /**
     * Test operation bTest from ServiceB.
     */
    @route("/bTest")
    bTest(@query("api-version") apiVersion: VersionsB): void;
  }
}
