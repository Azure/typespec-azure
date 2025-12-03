import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @clientLocation decorator - moving operations between clients")
@scenarioService("/azure/client-generator-core/client-location")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientlocation.MoveMethodParameterToClient",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ClientLocation.MoveMethodParameterToClient;

model Blob {
  id: string;
  name: string;
  size: int32;
  path: string;
}

// Scenario 1: Move method parameter to client
@scenarioDoc("""
  Test moving a method parameter to client.
  
  The parameter `storageAccount` from operation `getBlob` should be moved to the `MoveMethodParameterToClient` in the generated code.
  
  Expected request:
  - GET /blob?storageAccount=testaccount&container=testcontainer&blob=testblob.txt
  
  Expected response:
  - Status: 200
  - Body: {"id": "blob-001", "name": "testblob.txt", "size": 1024, "path": "/testcontainer/testblob.txt"}
  """)
@scenario
interface BlobOperations {
  @route("/blob")
  @get
  getBlob(
    @query
    @global.Azure.ClientGenerator.Core.clientLocation(MoveMethodParameterToClient)
    storageAccount: string,

    @query container: string,
    @query blob: string,
  ): Blob;
}
