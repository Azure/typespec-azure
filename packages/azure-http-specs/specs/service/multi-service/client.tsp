import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/http";
import "@typespec/versioning";

using Azure.ClientGenerator.Core;
using Spector;
using Http;
using Versioning;

@scenarioDoc("""
  Test that a client can expose operations from multiple services.
  This scenario demonstrates creating a unified client that provides access to 
  operations from different services using the @client decorator.
  
  ```ts
  const client = new MultiServiceClient();
  
  // Call operations from first service - uses api-version 1.1.0
  client.firstOne();
  client.firstTwo();
  
  // Call operations from second service - uses api-version 2.1.0
  client.secondOne();
  client.secondTwo();
  ```
  """)
@scenario
@route("/multi-service")
namespace Service.MultiService.Scenario {
  @get
  @route("/first/one")
  @scenario
  @scenarioDoc("Call operation one from first service with api-version 1.1.0")
  op firstOne(@query("api-version") apiVersion: string): void;

  @get
  @route("/first/two")
  @scenario
  @scenarioDoc("Call operation two from first service with api-version 1.1.0")
  op firstTwo(@query("api-version") apiVersion: string): void;

  @get
  @route("/second/one")
  @scenario
  @scenarioDoc("Call operation one from second service with api-version 2.1.0")
  op secondOne(@query("api-version") apiVersion: string): void;

  @get
  @route("/second/two")
  @scenario
  @scenarioDoc("Call operation two from second service with api-version 2.1.0")
  op secondTwo(@query("api-version") apiVersion: string): void;
}
