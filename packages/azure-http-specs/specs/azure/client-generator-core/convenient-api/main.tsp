import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("Test for convenientAPI and protocolAPI decorators.")
@scenarioService("/azure/client-generator-core/convenient-api")
namespace _Specs_.Azure.ClientGenerator.Core.ConvenientApi;

@route("/convenientNamespace")
@operationGroup
@scenario
@scenarioDoc("""
  Test @convenientAPI decorator applied at namespace level.
  All operations in this namespace should not generate convenient methods.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
@convenientAPI(false)
namespace ConvenientNamespace {
  model TestModel {
    name: string;
  }

  @route("/operation1")
  @get
  op operation1(@query name: string): TestModel;

  @route("/operation2")
  @post
  op operation2(@query name: string): TestModel;
}

@route("/protocolNamespace")
@operationGroup
@scenario
@scenarioDoc("""
  Test @protocolAPI decorator applied at namespace level.
  All operations in this namespace should not generate protocol methods.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
@protocolAPI(false)
namespace ProtocolNamespace {
  model TestModel {
    name: string;
  }

  @route("/operation1")
  @get
  op operation1(@query name: string): TestModel;

  @route("/operation2")
  @post
  op operation2(@query name: string): TestModel;
}

@route("/convenientInterface")
@operationGroup
@scenario
@scenarioDoc("""
  Test @convenientAPI decorator applied at interface level.
  All operations in this interface should not generate convenient methods.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
namespace ConvenientInterfaceNs {
  model TestModel {
    name: string;
  }

  @convenientAPI(false)
  interface ConvenientInterface {
    @route("/operation1")
    @get
    op operation1(@query name: string): TestModel;

    @route("/operation2")
    @post
    op operation2(@query name: string): TestModel;
  }
}

@route("/protocolInterface")
@operationGroup
@scenario
@scenarioDoc("""
  Test @protocolAPI decorator applied at interface level.
  All operations in this interface should not generate protocol methods.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
namespace ProtocolInterfaceNs {
  model TestModel {
    name: string;
  }

  @protocolAPI(false)
  interface ProtocolInterface {
    @route("/operation1")
    @get
    op operation1(@query name: string): TestModel;

    @route("/operation2")
    @post
    op operation2(@query name: string): TestModel;
  }
}
