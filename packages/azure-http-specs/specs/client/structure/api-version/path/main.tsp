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

model PathApiVersionParam {
  @path
  version: string;
}

@scenario
@scenarioDoc("Set a path service api version")
@doc("Path api version parameter.")
@route("/path/{version}")
@post
op pathApiVersion(...PathApiVersionParam): OkResponse;
