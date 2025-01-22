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

model QueryApiVersionParam {
  @query
  version: string;
}

@scenario
@scenarioDoc("Set a query parameter as the  service api version")
@doc("Query api version parameter.")
@route("/query")
@post
op queryApiVersion(...QueryApiVersionParam): OkResponse;
