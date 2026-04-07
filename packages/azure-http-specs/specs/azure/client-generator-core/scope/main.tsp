import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @scope decorator to control which languages include operations and properties.")
@scenarioService("/azure/client-generator-core/scope")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.scope", "java")
namespace _Specs_.Azure.ClientGenerator.Core.Scope;

model Resource {
  name: string;
}

@scenario
@scenarioDoc("""
  This scenario tests that an operation scoped to a specific set of languages is only
  generated for those languages. The 'scopedOp' operation should only be generated for
  Python and Java. Other languages should not include this operation.
  Expected response body:
  ```json
  { "name": "sample" }
  ```
  """)
namespace ScopedOperation {
  @route("/scopedOp")
  @get
  @global.Azure.ClientGenerator.Core.scope("python, java")
  op scopedOp(): Resource;
}

@scenario
@scenarioDoc("""
  This scenario tests that an operation scoped with negation is generated for all
  languages except those excluded. The 'negatedOp' operation should NOT be generated
  for C# but should be generated for all other languages.
  Expected response body:
  ```json
  { "name": "sample" }
  ```
  """)
namespace NegatedScopeOperation {
  @route("/negatedOp")
  @get
  @global.Azure.ClientGenerator.Core.scope("!csharp")
  op negatedOp(): Resource;
}
