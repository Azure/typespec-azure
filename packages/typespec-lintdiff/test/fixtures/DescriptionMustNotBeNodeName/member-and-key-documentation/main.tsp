import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

enum State {
  @doc("Ready.")
  Ready: "ready",
}

union Mode {
  @doc("Active.")
  Active: "active",

  string,
}

model Widget {
  @key
  @doc("id.")
  id: string;

  state: State;
  mode: Mode;
}

@route("/widgets")
@doc("Read the available widgets.")
@get
op read(@query("api-version") @doc("API version") apiVersion: string): Widget;
