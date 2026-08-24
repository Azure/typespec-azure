import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.Rest;
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

model UpdateRequest {
  @visibility(Lifecycle.Read)
  readOnlyIdentity?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;

  records?: Record<RecordValue>;
  description?: string;
}

model RecordValue {
  @header
  legacyHeader?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;

  description?: string;
}

model ReadResponse {
  @visibility(Lifecycle.Delete)
  deleteOnlyIdentity?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;

  description?: string;
}

@route("/widgets/{widgetName}")
interface Widgets {
  @patch(#{ implicitOptionality: true })
  update(@path widgetName: string, ...UpdateRequest): void;

  @get
  read(@path widgetName: string): ReadResponse;
}
