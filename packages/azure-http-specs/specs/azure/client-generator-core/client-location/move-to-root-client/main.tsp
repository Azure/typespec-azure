import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @clientLocation decorator - moving operations between clients")
@scenarioService("/azure/client-generator-core/client-location")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientlocation.MoveToRootClient",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ClientLocation.MoveToRootClient;

// Scenario 1: Move an operation to root client
@scenarioDoc("""
  Test moving an operation to the root client.
  
  Operation `getHealthStatus` from interface `ResourceOperations` should be moved to the root client using @clientLocation(service namespace).
  
  Expected client structure:
  - Interface ResourceOperations should contain only operation `getResource`
  - Root client should contain operation `getHealthStatus` (moved from ResourceOperations)
  """)
@scenario
interface ResourceOperations {
  @route("/resource")
  @get
  getResource(): void;

  @route("/health")
  @get
  @global.Azure.ClientGenerator.Core.clientLocation(
    _Specs_.Azure.ClientGenerator.Core.ClientLocation.MoveToRootClient
  )
  getHealthStatus(): void;
}
