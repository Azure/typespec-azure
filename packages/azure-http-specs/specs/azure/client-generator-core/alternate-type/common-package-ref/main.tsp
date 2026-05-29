import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("""
  Test using @alternateType with ExternalType to reference a pre-existing
  typespec-defined common package. Instead of generating types inline,
  language emitters should reference the types from the common package.
  """)
@scenarioService("/azure/client-generator-core/alternate-type/common-package-ref")
@service
namespace _Specs_.Azure.ClientGenerator.Core.AlternateType.CommonPackageRef;

/** Address model that mirrors the common package's Address type on the wire. */
model Address {
  city: string;
  state: string;
}

/** Model that has a property referencing the common package type. */
model ModelWithAddressProperty {
  address: Address;
  name: string;
}

@scenario
@scenarioDoc("""
  Input: None
  Output: Address object.
  Example response:
  ```json
  {
    "city": "Seattle",
    "state": "WA"
  }
  ```
  """)
@route("/model")
@get
op getModel(): Address;

@scenario
@scenarioDoc("""
  Input: Address object in request body.
  Example input:
  ```json
  {
    "city": "Seattle",
    "state": "WA"
  }
  ```
  Output: None (204/empty response)
  """)
@route("/model")
@put
op putModel(@body body: Address): void;

@scenario
@scenarioDoc("""
  Input: None
  Output: ModelWithAddressProperty object.
  Example response:
  ```json
  {
    "address": {
      "city": "Seattle",
      "state": "WA"
    },
    "name": "test"
  }
  ```
  """)
@route("/property")
@get
op getProperty(): ModelWithAddressProperty;

@scenario
@scenarioDoc("""
  Input: ModelWithAddressProperty object in request body.
  Example input:
  ```json
  {
    "address": {
      "city": "Seattle",
      "state": "WA"
    },
    "name": "test"
  }
  ```
  Output: None (204/empty response)
  """)
@route("/property")
@put
op putProperty(@body body: ModelWithAddressProperty): void;
