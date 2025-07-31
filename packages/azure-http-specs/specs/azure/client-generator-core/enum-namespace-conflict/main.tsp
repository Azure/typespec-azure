/**
 * Test for enum with same name in different namespace
 * This is valid in TypeSpec, but will cause SDK generation problem.
 * For such cases, we should use client.tsp to rename one of them.
 */
import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";
import "@azure-tools/typespec-azure-core";
import "@typespec/versioning";

using Http;
using Azure.ClientGenerator.Core;
using Azure.Core;
using Versioning;
using Spector;

@scenarioService(
  "/azure/client-generator-core/enum-namespace-conflict",
  {
    versioned: Versions,
  }
)
namespace _Specs_.Azure.ClientGenerator.Core.EnumNamespaceConflict;

@doc("The version of the API.")
enum Versions {
  @doc("The version 2022-12-01-preview.")
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  v2022_12_01_preview: "2022-12-01-preview",
}

namespace FirstNamespace {
  @doc("Status enum in first namespace")
  enum Status {
    @doc("Active status")
    Active: "active",
    
    @doc("Inactive status") 
    Inactive: "inactive",
  }

  model FirstModel {
    @doc("Status from first namespace")
    status: Status;
    
    @doc("Name of the item")
    name: string;
  }
}

namespace SecondNamespace {
  @doc("Status enum in second namespace")
  enum Status {
    @doc("Running status")
    Running: "running",
    
    @doc("Stopped status")
    Stopped: "stopped",
  }

  model SecondModel {
    @doc("Status from second namespace")
    status: Status;
    
    @doc("Description of the item")
    description: string;
  }
}

@operationGroup
@route("/first")
interface FirstOperations {
  @scenario
  @scenarioDoc("""
    Test enum with same name in different namespace - first namespace.
    This demonstrates the conflict when both FirstNamespace.Status and SecondNamespace.Status 
    exist without renaming. SDK generators may fail to distinguish between them.
    Expected request body:
    ```json
    {"status": "active", "name": "test"}
    ```
    """)
  @post
  @doc("Operation using first namespace Status enum")
  op first(@header contentType: "application/json", @body body: FirstNamespace.FirstModel): {
    @statusCode _: 200;
    @header contentType: "application/json";
    @body body: FirstNamespace.FirstModel;
  };
}

@operationGroup  
@route("/second")
interface SecondOperations {
  @scenario
  @scenarioDoc("""
    Test enum with same name in different namespace - second namespace.
    This demonstrates the conflict when both FirstNamespace.Status and SecondNamespace.Status 
    exist without renaming. The client.tsp file resolves this by renaming SecondNamespace.Status to SecondStatus.
    Expected request body:
    ```json
    {"status": "running", "description": "test description"}
    ```
    """)
  @post
  @doc("Operation using second namespace Status enum")
  op second(@header contentType: "application/json", @body body: SecondNamespace.SecondModel): {
    @statusCode _: 200;
    @header contentType: "application/json";
    @body body: SecondNamespace.SecondModel;
  };
}