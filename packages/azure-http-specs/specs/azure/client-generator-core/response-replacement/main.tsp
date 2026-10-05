import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;

@doc("Test scenarios for client response replacement.")
@scenarioService("/azure/client-generator-core/response-replacement")
namespace _Specs_.Azure.ClientGenerator.Core.ResponseReplacement;

model Widget {
  name: string;
}

@scenario
@scenarioDoc("""
  Verify that `replaceResponseWithVoid` removes the generated method response while preserving the
  service response on the wire.
  Expected response:
  - Status: 200
  - Body: {"name":"widget"}
  """)
@route("/void")
@post
op voidResponse(): Widget;

@scenario
@scenarioDoc("""
  Verify that `replaceResponseWithBytes` exposes the raw response bytes from the generated method
  while preserving the JSON service response on the wire.
  Expected response:
  - Status: 200
  - Content-Type: application/json
  - Body: {"name":"widget"}
  """)
@route("/bytes")
@get
op bytesResponse(): Widget;
