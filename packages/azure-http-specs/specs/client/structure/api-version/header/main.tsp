/**
 * DO NOT GENERATE FROM THIS FILE USE client.tsp
 * This is just to simulate a service entrypoint
 */
import "../service.tsp";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ClientGenerator.Core;
using Spector;

namespace Client.AlternateApiVersion.Service;

model HeaderApiVersionParam {
  @header("x-ms-version")
  version: string;
}

@scenario
@scenarioDoc("Set a header as the  service api version")
@doc("Header api version parameter.")
@route("/header")
@post
op headerApiVersion(...HeaderApiVersionParam): OkResponse;
