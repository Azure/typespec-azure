import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test for azure related encode decorator.")
@scenarioService("/azure/payload/encoding")
@scenario
@scenarioDoc("""
  Test case for azure specific encoding. SDK should generate correct serialization format according to the set encoding.
  """)
namespace _Specs_.Azure.Payload.Encoding;

model DurationModel {
  @encode("duration-constant")
  input: duration;
}

@doc("""
  Test duration with azure specific encoding.
  Expected request body:
  ```json
  {
    "input": "1.02:59:59.5000000"
  }
  ```
  """)
@put
@route("/duration-constant")
op durationConstant(
  @body body: DurationModel
): NoContentResponse;
