import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;

@doc("Test default content type behavior for file uploads.")
@scenarioService("/azure/client-generator-core/file-content-type")
@service
namespace _Specs_.Azure.ClientGenerator.Core.FileContentType;

@scenario
@scenarioDoc("""
  Upload a File request body without an explicit content type.
  Expected request:
  - Content-Type: application/octet-stream
  - Body: test file content
  Expected response: 204 No Content
  """)
@route("/default")
@post
op uploadDefault(@bodyRoot file: File): NoContentResponse;
