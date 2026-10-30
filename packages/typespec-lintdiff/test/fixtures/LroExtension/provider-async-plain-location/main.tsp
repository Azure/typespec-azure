import "../standard-operations.tsp";

using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations
interface ProviderOperations {
  /** Start a tenant-wide provider operation. */
  startProvider is ArmProviderActionAsync<
    Request = void,
    Response = void,
    LroHeaders = PlainLocationHeaders
  >;
}
