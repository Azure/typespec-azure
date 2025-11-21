import "@typespec/http";
import "@typespec/versioning";

using Http;
using Versioning;

@doc("Simulates a first service for testing multiple services in one client")
@server("http://localhost:3000", "First service endpoint")
@versioned(FirstService.FirstServiceVersions)
namespace Service.MultiService.FirstService {
  enum FirstServiceVersions {
    v1_0: "1.0.0",
    v1_1: "1.1.0",
  }
  @route("/first")
  interface Operations {
    @doc("Operation from first service")
    @route("/one")
    firstOne(@query("api-version") apiVersion: FirstServiceVersions): void;

    @doc("Another operation from first service")
    @route("/two")
    firstTwo(@query("api-version") apiVersion: FirstServiceVersions): void;
  }
}

@doc("Simulates a second service for testing multiple services in one client")
@server("http://localhost:3000", "Second service endpoint")
@versioned(SecondService.SecondServiceVersions)
namespace Service.MultiService.SecondService {
  enum SecondServiceVersions {
    v2_0: "2.0.0",
    v2_1: "2.1.0",
  }
  @route("/second")
  interface Operations {
    @doc("Operation from second service")
    @route("/one")
    secondOne(@query("api-version") apiVersion: SecondServiceVersions): void;

    @doc("Another operation from second service")
    @route("/two")
    secondTwo(@query("api-version") apiVersion: SecondServiceVersions): void;
  }
}
