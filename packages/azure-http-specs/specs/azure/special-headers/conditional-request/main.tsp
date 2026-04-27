import "@azure-tools/typespec-azure-core";
import "@typespec/http";
import "@typespec/spector";

using Azure.Core;
using Http;
using Spector;

@doc("Illustrates conditional request headers with custom header names and eTag types")
@scenarioService("/azure/special-headers/conditional-request")
namespace Azure.SpecialHeaders.ConditionalRequest;

@scenario
@doc("Check when If-Match and If-None-Match use the standard header names with eTag type.")
@scenarioDoc("""
  Check when If-Match and If-None-Match use the standard header names with eTag type.
  Expected header parameters:
  - if-match="valid"
  - if-none-match="invalid"
  """)
@post
@route("/if-match")
op postIfMatch(
  @header("If-Match")
  @doc("The request should only proceed if an entity matches this string.")
  ifMatch?: eTag,

  @header("If-None-Match")
  @doc("The request should only proceed if no entity matches this string.")
  ifNoneMatch?: eTag,
): NoContentResponse;

@scenario
@doc("Check when custom header names are used with eTag type for conditional requests.")
@scenarioDoc("""
  Check when custom header names are used with eTag type for conditional requests.
  Expected header parameters:
  - x-ms-blob-if-match="valid"
  - x-ms-blob-if-none-match="invalid"
  """)
@post
@route("/custom-if-match")
op postCustomIfMatch(
  @header("x-ms-blob-if-match")
  @doc("The request should only proceed if an entity matches this string.")
  ifMatch?: eTag,

  @header("x-ms-blob-if-none-match")
  @doc("The request should only proceed if no entity matches this string.")
  ifNoneMatch?: eTag,
): NoContentResponse;
