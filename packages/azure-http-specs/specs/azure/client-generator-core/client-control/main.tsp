import "@typespec/http";
import "@typespec/rest";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using Spector;

@doc("Test scenarios for language-specific and emitter-specific client controls.")
@scenarioService("/azure/client-generator-core/client-control")
namespace _Specs_.Azure.ClientGenerator.Core.ClientControl;

model CompositionBase {
  enabled: boolean;
}

model ClientOptionModel {
  id: string;
}

model SerializerModel {
  value: string;
}

model ScopedModel {
  common: string;
  languageSpecific: string;
}

model DisabledPage {
  @pageItems
  value: string[];

  @nextLink
  nextLink?: url;
}

interface ProtocolApi {
  @scenario
  @scenarioDoc("""
    Verify that `@protocolAPI(false)` disables the C# protocol method while preserving the convenience method.
    Input: None.
    Expected response body:
    ```json
    {
      "value": "protocol"
    }
    ```
    """)
  @route("/protocol-api")
  @get
  get(): SerializerModel;
}

interface ClientOption {
  @scenario
  @scenarioDoc("""
    Verify that `@clientOption` accepts a model reference for an emitter-specific option.
    Input: None.
    Expected response body:
    ```json
    {
      "id": "client-option"
    }
    ```
    """)
  @route("/client-option")
  @get
  get(): ClientOptionModel;
}

interface SystemTextJson {
  @scenario
  @scenarioDoc("""
    Verify that `@useSystemTextJsonConverter` marks a response model for the C# emitter.
    Input: None.
    Expected response body:
    ```json
    {
      "value": "system-text-json"
    }
    ```
    """)
  @route("/system-text-json")
  @get
  get(): SerializerModel;
}

interface Scope {
  @scenario
  @scenarioDoc("""
    Verify that `@scope` restricts a model property to the C# emitter.
    Input: None.
    Expected response body:
    ```json
    {
      "common": "all-languages",
      "languageSpecific": "csharp"
    }
    ```
    """)
  @route("/scope")
  @get
  get(): ScopedModel;
}

interface OperationScope {
  @scenario
  @scenarioDoc("""
    Verify that `@scope` restricts an operation to the C# emitter.
    Input: None.
    Expected response body:
    ```json
    {
      "value": "csharp"
    }
    ```
    """)
  @route("/operation-scope")
  @get
  get(): SerializerModel;
}

interface DisablePageable {
  @scenario
  @scenarioDoc("""
    Verify that `@disablePageable` generates a regular method instead of a paging method.
    Input: None.
    Expected response body:
    ```json
    {
      "value": ["first", "second"]
    }
    ```
    """)
  @route("/disable-pageable")
  @list
  @get
  list(): DisabledPage;
}
