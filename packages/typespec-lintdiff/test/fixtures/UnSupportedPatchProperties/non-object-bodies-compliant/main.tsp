import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model FirstPatchBody {
  value?: string;
}

model SecondPatchBody {
  otherValue?: string;
}

@route("/widgets/{widgetName}")
@patch
op updateScalar(@path widgetName: string, @body body: string): void;

@route("/otherWidgets/{widgetName}")
@patch
op updateUnion(@path widgetName: string, @body body: FirstPatchBody | SecondPatchBody): void;
