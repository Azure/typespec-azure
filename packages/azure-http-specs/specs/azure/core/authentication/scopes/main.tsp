import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("Ordinary explicit OAuth scopes need no Azure token profile.")
@scenarioService("/azure/core/authentication/scopes")
@useAuth(ServiceAuth)
namespace _Specs_.Azure.Core.Authentication.Scopes;

model ServiceAuth
  is AadOauth2Auth<["https://service.example.com/read", "https://service.example.com/write"]>;

@scenario
@scenarioDoc("""
  Use a recording credential that echoes requested scopes joined by a space as its
  access token. Expect exactly [https://service.example.com/read,
  https://service.example.com/write], in that order, with no /.default completion.
  Expect the matching Bearer authorization header and response 204.
  """)
@get
@route("/explicit")
op explicitScopes(): NoContentResponse;
