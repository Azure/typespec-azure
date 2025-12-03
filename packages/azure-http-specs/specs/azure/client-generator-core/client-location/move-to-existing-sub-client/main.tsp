import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @clientLocation decorator - moving operations between clients")
@scenarioService("/azure/client-generator-core/client-location")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientlocation.MoveToExistingSubClient",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ClientLocation.MoveToExistingSubClient;

// Scenario 1: Move an operation to another sub client (existing interface)
@scenarioDoc("""
  Test moving an operation from one sub client to another existing sub client.
  
  Operation `deleteUser` from interface `UserOperations` should be moved to interface `AdminOperations` using @clientLocation(AdminOperations).
  
  Expected client structure:
  - Interface UserOperations should contain only operation `getUser`
  - Interface AdminOperations should contain operations `getAdminInfo` and `deleteUser` (moved from UserOperations)
  """)
@scenario
interface UserOperations {
  @route("/user")
  @get
  getUser(): void;

  @route("/user")
  @delete
  @global.Azure.ClientGenerator.Core.clientLocation(AdminOperations)
  deleteUser(): void;
}

interface AdminOperations {
  @route("/admin")
  @get
  getAdminInfo(): void;
}
