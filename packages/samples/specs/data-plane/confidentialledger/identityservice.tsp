import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;

@useDependency(Azure.Core.Versions.v1_0_Preview_2)
@server(
  "{identityServiceUri}",
  "Confidential Ledger Service",
  {
    identityServiceUri: string,
  }
)
namespace Azure.Security.ConfidentialLedgerIdentity;

@resource("ledgerIdentity")
@doc("Contains the information about a Confidential Ledger.")
model LedgerIdentityInformation {
  @key
  @doc("Id for the ledger.")
  @visibility("read")
  ledgerId: string;

  @doc("PEM-encoded certificate used for TLS by the Confidential Ledger.")
  ledgerTlsCertificate: string;
}

#suppress "deprecated" "This is kept as an example that the old signatures are deprecated."
@get
@doc("Gets a LedgerIdentityInformation.")
@summary("Gets identity information for a Confidential Ledger instance.")
op getLedgerIdentity is Azure.Core.ResourceRead<LedgerIdentityInformation>;
