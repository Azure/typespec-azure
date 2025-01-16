import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("Test for api-version decorator.")
@scenarioService("/azure/client-generator-core/api-version")
namespace _Specs_.Azure.ClientGenerator.Core.ApiVersion;

@scenario
@scenarioDoc("Set a header as the  service api version")
@doc("Header api version parameter.")
@route("/header")
@post
op headerApiVersion(
  @global.Azure.ClientGenerator.Core.apiVersion
  @header("x-ms-version")
  version: string,
): OkResponse;

@scenario
@scenarioDoc("Set a query parameter as the  service api version")
@doc("Query api version parameter.")
@route("/query")
@post
op queryApiVersion(@query("version") version: string): OkResponse;

@scenario
@scenarioDoc("Set a path service api version")
@doc("Path api version parameter.")
@route("/path/{version}")
@post
op pathApiVersion(@path version: string): OkResponse;
