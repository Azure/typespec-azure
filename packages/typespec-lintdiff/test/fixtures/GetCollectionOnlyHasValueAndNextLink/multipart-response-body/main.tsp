import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  @route("/scope/providers/Microsoft.TestService/widgetArchives")
  @doc("Download widget archives.")
  @extension("x-ms-examples", #{})
  @get
  downloadWidgetArchives(...Azure.ResourceManager.CommonTypes.ApiVersionParameter):
    | {
        @multipartBody fields: {
          archive: HttpPart<Http.File>;
          description: HttpPart<string>;
        };
      }
    | ErrorResponse;
}
