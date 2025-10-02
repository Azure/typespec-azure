import "@azure-tools/typespec-azure-core";
import "@typespec/spector";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-client-generator-core";

using global.Azure.Core;
using global.Azure.Core.Traits;
using global.TypeSpec.Http;
using global.TypeSpec.Rest;
using global.TypeSpec.Versioning;
using Spector;

#suppress "@azure-tools/typespec-azure-core/casing-style" "For spec"
@doc("Illustrates LRO status monitoring with @lroFailed decorator")
@scenarioService(
  "/azure/core/lro/custom/lro-failed",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace("azure.core.lro.custom.lroFailed", "java")
namespace _Specs_.Azure.Core.Lro.Custom.LroFailed;

@doc("The API version.")
enum Versions {
  @doc("The 2022-12-01-preview version.")
  v2022_12_01_preview: "2022-12-01-preview",
}

/**
 * Operation status.
 */
@lroStatus
union OperationStatus {
  string,

  /** The operation succeeded. */
  Succeeded: "Succeeded", // The correct response should be "Succeeded", but this has already shipped.

  /** The operation is in progress. */
  InProgress: "InProgress",

  /** The operation failed. */
  @lroFailed
  UnexpectedFailure: "UnexpectedFailure", // The correct response should be "Failed", but this has already shipped.
}

/**
 * The Security Domain operation status.
 */
model SecurityDomainOperationStatus {
  /**
   * Operation status.
   */
  status?: OperationStatus;

  /**
   * Details of the operation status.
   */
  #suppress "@azure-tools/typespec-azure-core/casing-style" "Preserving original casing"
  status_details?: string;
}

/**
 * The Security Domain.
 */
model SecurityDomainObject {
  /**
   * The Security Domain.
   */
  value: string;
}

/**
 * Restore the provided Security Domain.
 */
@scenario
@scenarioDoc("""
  Test LRO operation with @lroFailed decorator. Send security domain object with value 'test-domain' and expect operation to eventually return status 'UnexpectedFailure'.
  
  Expected sequence:
  1. POST /securitydomain/upload with body {"value": "test-domain"}
  2. Returns 202 with operation-location header
  3. GET operation status returns InProgress initially
  4. GET operation status eventually returns UnexpectedFailure (not Failed)
  """)
@pollingOperation(uploadPending)
@finalOperation(uploadPending)
@route("/securitydomain/upload")
@post
op upload is Foundations.LongRunningOperation<
  {
    /**
     * The Security Domain to be restored.
     */
    @body
    securityDomain: SecurityDomainObject;
  },
  {
    /**
     * The status of the Security Domain restore operation.
     */
    @body response: SecurityDomainOperationStatus;
  }
>;

/**
 * Get Security Domain upload operation status
 */
@scenario
@scenarioDoc("""
  Poll operation status endpoint. Initially returns InProgress, then UnexpectedFailure on completion.
  
  Expected behavior:
  - First few calls return status: 'InProgress'
  - Eventually returns status: 'UnexpectedFailure' (indicating @lroFailed)
  """)
@route("/securitydomain/upload/pending")
@get
op uploadPending is Foundations.Operation<{}, SecurityDomainOperationStatus>;
