import "@typespec/openapi";
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;

@versioned(Azure.ResourceManager.Foundations.Versions)
@service
namespace Azure.ResourceManager.Foundations;

/**
 * Supported versions of Azure.ResourceManager building blocks.
 */
@doc("Supported versions of Azure.ResourceManager building blocks.")
enum Versions {
  @doc("ARM common types v3")
  v3,

  @doc("ARM common types v3")
  v4,

  @doc("ARM common types v3")
  v5,
}
