import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorator @deserializeEmptyStringAsNull.")
@scenarioService("/azure/client-generator-core/deserialize-empty-string-as-null")
namespace _Specs_.Azure.ClientGenerator.Core.DeserializeEmptyStringAsNull;

@doc("This is the output Model.")
model EmptyUrl {
  @deserializeEmptyStringAsNull
  serviceUrl: url;
}

@scenario
@route("/emptyUrl")
@scenarioDoc("""
  This scenario tests if client code correctly deserializes empty url as null.
  Expected response body:
  ```json
  {
    "serviceUrl": ""
  }
  ```
  """)
@get
op emptyUrl(): EmptyUrl;
