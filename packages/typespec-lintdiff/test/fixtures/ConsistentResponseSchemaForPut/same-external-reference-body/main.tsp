import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

model OkBody {
  @statusCode statusCode: 200;
  @body body: CommonTypes.SystemData;
}

model CreatedBody {
  @statusCode statusCode: 201;
  @body body: CommonTypes.SystemData;
}

@route("/system-data")
@put
op createOrUpdate(@query("api-version") apiVersion: string): OkBody | CreatedBody;
