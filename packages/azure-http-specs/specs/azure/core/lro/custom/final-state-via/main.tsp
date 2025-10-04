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
@doc("Illustrates retrieving final operation status with @useFinalStateVia decorator")
@scenarioService(
  "/azure/core/lro/custom/final-state-via",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace("azure.core.lro.custom.useFinalStateVia", "java")
namespace _Specs_.Azure.Core.Lro.Custom.UseFinalStateVia;

@doc("The API version.")
enum Versions {
  @doc("The 2022-12-01-preview version.")
  v2022_12_01_preview: "2022-12-01-preview",
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
  Test LRO operation with @useFinalStateVia decorator. Send security domain object with value 'test-domain' and retrieve final state via the Azure-AsyncOperation header.
  
  Expected sequence:
  1. POST /securitydomain/upload with body {"value": "test-domain"}
  2. Returns 202 with operation-location header
  3. GET operation status returns InProgress initially
  4. GET operation status eventually returns Success (not Succeeded)
  5. Final GET to original URI returns the SecurityDomainObject
  """)
@route("/securitydomain/upload")
@useFinalStateVia("location")
@put
op upload is Foundations.LongRunningOperation<
  {
    /**
     * The Security Domain to be restored.
     */
    @body
    securityDomain: SecurityDomainObject;
  },
  Foundations.OperationStatus<SecurityDomainObject> & {
    /** Location header */
    @header("Location")
    location?: string;
  }
>;
