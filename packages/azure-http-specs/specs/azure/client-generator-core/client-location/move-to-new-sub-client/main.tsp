import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @clientLocation decorator - moving operations between clients")
@scenarioService("/azure/client-generator-core/client-location/move-to-new-sub-client")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientlocation.newsubclient",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ClientLocation.MoveToNewSubClient;

// Scenario 1: Move an operation to a new sub client (string name)
@scenarioDoc("""
  Test moving an operation to a new sub client specified by string name.
  
  Operation `archiveProduct` from interface `ProductOperations` should be moved to a new sub client named "ArchiveOperations" using @clientLocation("ArchiveOperations").
  
  Expected client structure:
  - Interface ProductOperations should contain only operation `listProducts`  
  - A new sub client "ArchiveOperations" should be created containing operation `archiveProduct`
  """)
@scenario
interface ProductOperations {
  @route("/products")
  @get
  listProducts(): void;

  @route("/products/archive")
  @post
  @global.Azure.ClientGenerator.Core.clientLocation("ArchiveOperations")
  archiveProduct(): void;
}
