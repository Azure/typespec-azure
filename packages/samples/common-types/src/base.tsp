import "@azure-tools/typespec-azure-core";
import "@typespec/openapi";

// Load the current versions of Azure.ResourceManager.CommonTypes.
import "../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/versions.tsp";

using Versioning;
using Http;

@service({
  title: "Common types",
})
namespace Azure.ResourceManager.CommonTypes {
  @route("dummy") op dummy(): void;
}

@versioned(Azure.ResourceManager.Versions)
namespace Azure.ResourceManager {
  /**
   * Supported versions of Azure.ResourceManager building blocks.
   */
  @doc("Supported versions of Azure.ResourceManager building blocks.")
  enum Versions {
    @doc("Version 1.0-preview.1")
    @useDependency(Azure.Core.Versions.v1_0_Preview_2)
    v1_0_Preview_1: "1.0-preview.1",
  }
}
