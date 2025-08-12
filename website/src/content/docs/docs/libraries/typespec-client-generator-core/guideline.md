---
title: Guideline for Client Emitter
---

This document provides guidance on using the TypeSpec Client Generator Core (TCGC) in client emitters.  
TCGC introduces a client type graph and provides helper functions for generating client code.  
Client emitters can rely on the client type graph instead of directly interacting with the TypeSpec core API.

## TCGC Library

TCGC abstracts common logic for client emitters across languages, allowing emitters to focus solely on language-specific code generation.

### Usage

To use TCGC, add it to your `package.json`:

```json
{
  "dependencies": {
    "@azure-tools/typespec-client-generator-core": "latest"
  }
}
```

In your emitter's `$onEmit` function, use [`createSdkContext`](../reference/js-api/functions/createsdkcontext/) to convert [`EmitContext`](https://typespec.io/docs/standard-library/reference/js-api/interfaces/emitcontext/) into [`SdkContext`](../reference/js-api/interfaces/sdkcontext/). The [`SdkContext.SdkPackage`](../reference/js-api/interfaces/sdkpackage/) contains the client type graph. See ["Client Type Graph"](#client-type-graph) for details.

If your client emitter has options or global variables, extend [`SdkContext`](../reference/js-api/interfaces/sdkcontext/) with your custom emitter context. Example:

```ts
import { EmitContext } from "@typespec/compiler";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";

interface PythonEmitterOptions extends SdkEmitterOptions {
  // Options specific to the client emitter
}

interface PythonSdkContext extends SdkContext<PythonEmitterOptions> {
  // Global variables for the client emitter
}

export async function $onEmit(context: EmitContext<PythonEmitterOptions>) {
  const emitterContext: PythonSdkContext = {
    ...createSdkContext(context),
    // Initialize global variables
  };
}
```

### Exporting TCGC Type Graph

TCGC can be used as a standalone emitter to export the type graph for debugging. Run:  
`tsp compile . --emit=@azure-tools/typespec-client-generator-core --options=@azure-tools/typespec-client-generator-core.emitter-name="<emitter-name>"`  
Replace `<emitter-name>` with your emitter name to generate the type graph file.

Alternatively, pass the [`exportTCGCoutput`](../reference/js-api/interfaces/createsdkcontextoptions/) option to [`createSdkContext`](../reference/js-api/functions/createsdkcontext/) to generate the type graph file (`<output-dir>/tcgc-output.yaml`) alongside client code.

### TCGC Playground

Use the [TCGC Playground](https://azure.github.io/typespec-azure/playground/?e=%40azure-tools%2Ftypespec-client-generator-core) to experiment with how specifications translate to the TCGC client type graph. Include the playground link when asking questions or reporting issues.

### TCGC Flags

TCGC provides flags to control the client type graph style, such as enabling or disabling convenience APIs. See the [documentation](../reference/emitter/#emitter-options) for details.

## TCGC Raw Types and Helpers

In order to introduce the client concept, TCGC introduces some new raw types and helper functions.

[`SdkClient`](../reference/js-api/interfaces/sdkclient/) represents a client and [`SdkOperationGroup`](../reference/js-api/interfaces/sdkoperationgroup/) represents a sub client.
Emitters can use [`listClients`](../reference/js-api/functions/listclients/) to get all the root clients calculated from the current spec. Then emitters can use [`listOperationGroups`](../reference/js-api/functions/listoperationgroups/) to get all the sub clients under one root client or sub client. Finally, emitters can use [`listOperationsInOperationGroup`](../reference/js-api/functions/listoperationsinoperationgroup/) to get all the operations under one client or sub client.

For these helper functions, the return type is either TCGC raw types or TypeSpec core types.

## Client Type Graph

Unlike TCGC raw types and helpers, the client type graph is a calculated complete type graph that represents your spec. Emitters can use it to get all client info without calling any extra functions. It is recommended to use this type graph instead of calculating all client-related logic with TCGC raw types or TypeSpec core types.

### Common Properties

Most TCGC types share the following common properties:

- **`namespace`**: Indicates the type's namespace.
- **`doc` and `summary`**: Contain documentation-related information.
- **`apiVersions`**: Indicates which API versions the type exists in.
- **`decorators`**: Stores all TypeSpec decorator info for advanced use cases.
- **`crossLanguageDefinitionId`**: A unique ID for a TCGC type that can be used for output mapping across different emitters.
- **`name`** and **`isGeneratedName`**: The type's name and whether the name was created by TCGC.
- **`access`**: Indicates whether the type has public or private accessibility.
- **`usage`**: Indicates the type's usage information; its value is a bitmap of [`UsageFlags`](../reference/js-api/enumerations/usageflags/) enumeration.
- **`deprecation`**: Indicates whether the type is deprecated and provides the deprecation message.
- **`clientDefaultValue`**: The type's default value if provided. Currently, it only exists in endpoint and API version parameters.

### Package

[`SdkPackage`](../reference/js-api/interfaces/sdkpackage/) represents a client package, containing all clients, operations, and types.

Clients, models, enums, and unions include namespace information. Emitters can use either:

- A flattened structure (`SdkPackage.clients`, `SdkPackage.enums`, `SdkPackage.models`, `SdkPackage.unions`)
- A hierarchical structure (`SdkPackage.namespaces`) requiring iteration through nested namespaces.

### License Information

Emitters can get package license info from `SdkPackage.licenseInfo`. The [`LicenseInfo`](../reference/js-api/interfaces/licenseinfo/) contains license details for client code comments or license file generation.

If `licenseInfo` is `undefined`, omit license information in the generated code or files.

Use `LicenseInfo.name` (license name), `LicenseInfo.company` (company name), `LicenseInfo.link` (license document link), `LicenseInfo.header` (header comments), and `LicenseInfo.description` (license file content) directly when generating license-related content.

For Azure services, emitters should hard-code the license configuration as follows:

```typescript
export async function $onEmit(context: EmitContext<SdkEmitterOptions>) {
  context.options.license = {
    name: "MIT License",
    company: "Microsoft Corporation",
  };
  const sdkContext = await createSdkContext(context);
  // ...
}
```

### Client

Emitters can get first-level clients of a client package from `SdkPackage.clients`. An [`SdkClientType`](../reference/js-api/interfaces/sdkclienttype/) represents a client in the package. Emitters can use `SdkClientType.children` to get nested sub clients, and use `SdkClientType.parent` to trace back.

`SdkClientType.clientInitialization` tells emitters how to initialize the client. [`SdkClientInitializationType`](../reference/js-api/interfaces/sdkclientinitializationtype/) contains info about the client's initialization parameters and how the client can be initialized: by parent client or by itself.

The initialization parameter can be either [`SdkEndpointParameter`](../reference/js-api/interfaces/sdkendpointparameter/), [`SdkCredentialParameter`](../reference/js-api/interfaces/sdkcredentialparameter/) or [`SdkMethodParameter`](../reference/js-api/interfaces/sdkmethodparameter/).

**SdkEndpointParameter** is a parameter for the client API endpoint. `SdkEndpointParameter.type` tells how to compose the endpoint. It can be an [`SdkEndpointType`](../reference/js-api/interfaces/sdkendpointtype/) type or union of `SdkEndpointType` types if there are multiple ways to compose the endpoint. `SdkEndpointType.serverUrl` is the base string of the endpoint while `SdkEndpointType.templateArguments` contains the template arguments used in the `SdkEndpointType.serverUrl` if they exist.

**SdkCredentialParameter** is a parameter for how to authorize the client. `SdkCredentialParameter.type` contains the details of the authorizations. It can be an [`SdkCredentialType`](../reference/js-api/interfaces/sdkcredentialtype/) type or union of `SdkCredentialType` types if there are multiple ways to authorize the client. `SdkCredentialType.scheme` is the scheme of the authorization method. Currently, TCGC only supports [`HttpAuth`](https://typespec.io/docs/libraries/http/reference/js-api/type-aliases/httpauth/).

**SdkMethodParameter** is a normal client-level parameter that can be used in some of the methods belonging to the client. For type details, refer to the next section.

### Method

Emitters get all methods belonging to a client with `SdkClientType.methods`. An [`SdkServiceMethod`](../reference/js-api/type-aliases/sdkservicemethod/) represents a client's method.

TCGC supports four kinds of methods: [`SdkBasicServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/), [`SdkPagingServiceMethod`](../reference/js-api/interfaces/sdkpagingservicemethod/), [`SdkLroServiceMethod`](../reference/js-api/interfaces/sdklroservicemethod/), and [`SdkLroPagingServiceMethod`](../reference/js-api/interfaces/sdklropagingservicemethod/).

**SdkBasicServiceMethod** is a basic method that calls a synchronous server-side API. It contains flags to indicate how the client signature should be generated, and the input and output of the method.

`SdkBasicServiceMethod.parameters` is the method's input. Its type [`SdkMethodParameter`](../reference/js-api/interfaces/sdkmethodparameter/) contains the type of the parameter along with some attributes of the parameter.

`SdkBasicServiceMethod.response` is the method's normal response while `SdkBasicServiceMethod.exceptions` contains the method's error responses.

**SdkPagingServiceMethod** is a paging method that has pageable responses. It extends `SdkBasicServiceMethod` and contains extra paging information.

**SdkLroServiceMethod** is an LRO method that calls a long-running server-side API. It extends `SdkBasicServiceMethod` and contains extra LRO information.

**SdkLroPagingServiceMethod** is an LRO method that calls a long-running server-side API and has pageable responses. It extends `SdkBasicServiceMethod`, `SdkPagingServiceMethod` and `SdkLroServiceMethod`.

### Operation

TCGC separates the client-level operation from the protocol-level operation. This way, TCGC can abstract away the protocol used to call the service (i.e. `HTTP` or `gRPC`).
Emitters can get the protocol-level operation from `SdkServiceMethod.operation`. An [`SdkServiceOperation`](../reference/js-api/type-aliases/sdkserviceoperation/) represents a protocol operation.

TCGC currently supports one kind of operation: [`SdkHttpOperation`](../reference/js-api/interfaces/sdkhttpoperation/).

`SdkHttpOperation` contains verb, path, URI template, query/header/path/cookie/body parameters, responses, and exceptions of an HTTP operation.

Each parameter for an HTTP operation has a `correspondingMethodParams` property to indicate the mapping of one payload parameter with one or more method-level parameters or model properties. This helps emitters determine how to compose the underlying payload with the method's parameters. One body parameter can have several method-level parameter or model property mappings because of the implicit body parameter resolving from the TypeSpec HTTP library.

### Type

For types in TypeSpec, TCGC provides several client types to represent them in a way that's more similar to client languages.

**Built-in Types:**

- [`SdkBuiltInType`](../reference/js-api/interfaces/sdkbuiltintype/) represents a [built-in TypeSpec type](https://typespec.io/docs/language-basics/built-in-types/) or a [`scalar`](https://typespec.io/docs/language-basics/scalars/) type that derives from a built-in TypeSpec type, excluding `utcDateTime`, `offsetDateTime` and `duration`. The `encode` property is added to these types when the `@encode` decorator exists, indicating how to encode when sending to the service.

**Date and Time Types:**

- [`SdkDateTimeType`](../reference/js-api/type-aliases/sdkdatetimetype/) and [`SdkDurationType`](../reference/js-api/interfaces/sdkdurationtype/) are converted from TypeSpec `utcDateTime`, `offsetDateTime` and `duration` types. The datetime encoding info is in the `encode` property.

**Collection Types:**

- [`SdkArrayType`](../reference/js-api/interfaces/sdkarraytype/), [`SdkTupleType`](../reference/js-api/interfaces/sdktupletype/) and [`SdkDictionaryType`](../reference/js-api/interfaces/sdkdictionarytype/) are converted from TypeSpec [`Array`](https://typespec.io/docs/language-basics/models/#array), [`Tuple`](https://typespec.io/docs/standard-library/reference/js-api/interfaces/tuple/) and [`Record`](https://typespec.io/docs/language-basics/models/#record) types.

**Nullable Types:**

- [`SdkNullableType`](../reference/js-api/interfaces/sdknullabletype/) represents a type whose value can be null. The actual type is in `SdkNullableType.type`.

**Enumeration Types:**

- [`SdkEnumType`](../reference/js-api/interfaces/sdkenumtype/) and [`SdkEnumValueType`](../reference/js-api/interfaces/sdkenumvaluetype/) represent TCGC enumeration types. They are typically converted from TypeSpec [`Enum`](https://typespec.io/docs/language-basics/enums/) types or [`Union`](https://typespec.io/docs/language-basics/unions/) types (for extensible enumeration cases).

**Literal Types:**

- [`SdkConstantType`](../reference/js-api/interfaces/sdkconstanttype/) represents a literal type in TypeSpec ([`StringLiteral`](https://typespec.io/docs/language-basics/type-literals/#string-literals), [`NumericLiteral`](https://typespec.io/docs/language-basics/type-literals/#numeric-literal), or [`BooleanLiteral`](https://typespec.io/docs/language-basics/type-literals/#boolean-literal)).

**Union Types:**

- [`SdkUnionType`](../reference/js-api/interfaces/sdkuniontype/) represents a TCGC union type. It is typically converted from a TypeSpec [`Union`](https://typespec.io/docs/language-basics/unions/) type.

**Model Types:**

- [`SdkModelType`](../reference/js-api/interfaces/sdkmodeltype/) represents a TCGC model type. It is typically converted from a TypeSpec [`Model`](https://typespec.io/docs/language-basics/models/) type.

**Model Property Types:**

- [`SdkModelPropertyType`](../reference/js-api/interfaces/sdkmodelpropertytype/) represents a TCGC model property type. It is typically converted from a TypeSpec [`ModelProperty`](https://typespec.io/docs/standard-library/reference/js-api/interfaces/modelproperty/) type. It represents a property of a model and has the following key properties:
  - `flatten`: Indicates if the property can be flattened
  - `additionalProperties`: Indicates if the model can accept additional properties with a specific type
  - For discriminated models:
    - `discriminatorProperty`: The property used as a discriminator
    - `discriminatedSubtypes`: List of all subtypes of this discriminated model
  - For subtypes of discriminated models:
    - `discriminatorValue`: The instance value for the discriminator for this subtype

### Example types

Example types help model the examples that TypeSpec authors define to help users understand how to use the API. TCGC currently only supports examples based on HTTP payload, so the examples are available in `SdkHttpOperation.examples`.

[`SdkHttpOperationExample`](../reference/js-api/interfaces/sdkhttpoperationexample/) represents an example. [`SdkHttpParameterExampleValue`](../reference/js-api/interfaces/sdkhttpparameterexamplevalue/), [`SdkHttpResponseExampleValue`](../reference/js-api/interfaces/sdkhttpresponseexamplevalue/), and [`SdkHttpResponseHeaderExampleValue`](../reference/js-api/interfaces/sdkhttpresponseheaderexamplevalue/) represent HTTP parameter, response body, and response header examples. Each type contains the example value and its corresponding definition type.

[`SdkExampleValue`](../reference/js-api/type-aliases/sdkexamplevalue/) represents an example value of different types. All related types are used to represent the example value of a definition type. One definition type may have different example value types.

For [`SdkUnionExampleValue`](../reference/js-api/interfaces/sdkunionexamplevalue/), since it is difficult to determine which union variant the example value should belong to, TCGC preserves the raw value and leaves this determination to the emitter.

For [`SdkModelExampleValue`](../reference/js-api/interfaces/sdkmodelexamplevalue/), TCGC helps map the example type to the correct subtype for discriminated types and separates additional property values from property values. However, for models with inheritance, TCGC does not break down the type graph but instead places all example values in the child model.

## Client Type Calculation Logic

### Client Detection

The clients depend on the combination usage of `Namespace`, `Interface`, `@service`, `@client`, `@operationGroup` and `@moveTo`.

If there is no explicitly defined `@client` or `@operationGroup`, then the first namespace with `@service` is a root client. The nested namespaces and interfaces under that namespace are sub clients with hierarchy. Meanwhile, any operations with `@moveTo` a `string` type target, is a sub client under the root client.

If there is any `@client` definition or `@operationGroup` definition, then each `@client` is a root client and each `@operationGroup` is a sub client with hierarchy.

If a detected client or sub client does not contain any sub client or operation, then this client is ignored.

### Client Initialization Creation

Normally, a client's initialization parameters include:

1. **Endpoint parameter**: Converted from `@server` definition on the service the client belongs to.
   - If the server URL is a constant, TCGC returns a templated endpoint with a default value of the constant server URL.
   - When the endpoint has additional template arguments, the type is a union of a completely-overridable endpoint and an endpoint that accepts template arguments.
   - If there are multiple servers, TCGC returns the union of all possibilities.

2. **Credential parameter**: Converted from `@useAuth` definition on the service the client belongs to.

3. **API version parameter**: If the service is versioned, then the API version parameter on method is elevated to client.
   - The API version parameter is detected by parameter name (`api-version` or `apiversion`) or parameter type (API version enum type used in `@versioned` decorator).

4. **Subscription ID parameter**: If the service is an ARM service, then the subscription ID parameter on method is elevated to client.

The client's initialization way is `undefined`. Emitters can choose how to initialize all the clients.

With `@clientInitialization` decorator, the default behavior may change. New client-level parameters are added. Client initialization way can be specified with initializing by parent client, initializing individually or both.

### Method Detection

The methods depend on the combination usage of `Operation`, `@scope` and `@moveTo`.

A client's operations include the `Operation` under the client's `Namespace` or `Interface`, adding any operations with `@moveTo` current client, deducting any operations with `@scope` out of current emitter or `@moveTo` another client.

### Method Parameters Handling

If `@override` is used for the method, the parameters are handled by the target method.

Parameters used in client (either API version parameter or client parameter defined in `@clientInitialization`) are filtered from method parameter list.

### Method Return Type Calculation

The method's return type is determined by the underlying operation's normal responses:

- If `@responseAsBool` is on the method, then the response is a boolean.
- If the responses contain multiple return types, the return type is a union of all the types.
- If the responses contain empty return type, the return type is wrapped with a nullable type.

The paging method's return type is an array type of the page items type. It is inferred from `@pageItems` or `@items` decorator.

The LRO method's return type is the final response type. It is inferred from `LroMetadata`.

### HTTP Operation Parameters Handling

The HTTP operation's parameters are inferred from TypeSpec HTTP lib type [`HttpOperationParameters`](https://typespec.io/docs/libraries/http/reference/js-api/interfaces/httpoperationparameters/). Different HTTP parameters are handled by specific logic based on the info from TypeSpec HTTP lib type [`HttpOperationParameter`](https://typespec.io/docs/libraries/http/reference/js-api/type-aliases/httpoperationparameter/).

TCGC infers the body parameter type from TypeSpec HTTP lib type [`HttpOperationBody`](https://typespec.io/docs/libraries/http/reference/js-api/interfaces/httpoperationbody/). If the body is explicitly defined (with `@body` or `@bodyRoot`), TCGC uses the type directly as the body type. If not, TCGC treats the body parameter as a spread case. For such body types, TCGC tries to get back the original model if all the spread properties are from one model. Otherwise, TCGC creates a new model type for the body parameter.

TCGC creates the `Content-Type` header parameter for any operation with body parameter if it doesn't exist, and creates the `Accept` header parameter for any operation with response that contains body. TCGC also creates corresponding method parameters for the operation's upper layer method for each case.

TCGC uses several ways to find an HTTP operation's parameter's corresponding method parameter or model property:

- Check if the parameter is a client-level method parameter.
- Check if the parameter is an API version parameter that has been elevated to client.
- Check if the parameter is a subscription parameter that has been elevated to client (only for ARM services).
- Check if the parameter is a method parameter or a nested model property of a method parameter (nested HTTP metadata case when using `@bodyRoot`).
- Check if all properties of the parameter can be mapped to a method parameter or a nested model property of a method parameter (spread).

### HTTP Operation Response Calculation

The response is inferred from TypeSpec HTTP lib type [`HttpOperationResponse`](https://typespec.io/docs/libraries/http/reference/js-api/interfaces/httpoperationresponse/).

For each response, TCGC will check the response's content. If contents from different responses are not equal, TCGC takes the last one as the response type. Any response with `*` status code or response content type that has `@error` decorator, TCGC puts them into the exception response list. Others are put in the response list.

If `@responseAsBool` is on the operation's upper level method, the `404` status code is always recognized as a normal response.

### Type Detection

TCGC uses the following steps to detect all the types in one spec:

1. Starts from the root clients and iterates all nested clients to find the methods.
2. For all methods, iterates all method's parameters to find types.
3. For all methods' underlying operations, iterates all operation's parameters, body parameter, response body, response header to find types.
4. If type is a `Union`, iterates all union variants to find types.
5. If type is a `Model`, iterates all model properties to find types, finds types for additional properties if they exist and finds types for model's base model.
6. If type is a `Model` with `@discriminator`, iterates all sub-types belonging to it.
7. If type is an `Array` or `Record`, finds types for the value type.
8. If type is a `Tuple`, iterates all values to find types.
9. If type is an `EnumMember`, finds types for the enum the member belongs to.
10. If type is a `UnionVariant`, finds types for the union the variant belongs to.
11. Iterates parameters defined in `@server` and finds types.
12. Iterates user-defined namespace for `Model`, `Enum` and `Union` to find orphan types (not referred by `Operation`).
13. Handles API version `Enum` used in `@versioned`.

### Access Calculation

If there is no `@access` used in the spec, all model properties, types, and methods in TCGC have `public` accessibility.
If `@access` is decorated on either `Namespace`, `Operation`, types, or model properties, the accessibility is overridden with the new [logic](../reference/decorators/#@Azure.ClientGenerator.Core.access).

### Usage Calculation

If there is no `@usage` used in the spec, all types' usage in TCGC is calculated by the place where the type is used. The `@usage` decorator can extend the usage for one type or all types under one namespace. The calculation logic is [here](../reference/decorators/#@Azure.ClientGenerator.Core.usage).

### Naming Logic for Anonymous Types

`SdkModelType`, `SdkEnumType`, `SdkUnionType`, and `SdkConstantType` always have names. If the original TypeSpec type does not have a name, TCGC creates a name for it. The naming logic follows these steps:

1. **Find the place where the type is used:**
   - Find if the type is used in the method's underlying operation: either in parameters, body parameter, response header, or response body.
   - Find if the type is used in the method's parameters.
   - Find if the type is used in orphan types.

2. **With the path of where the type is used:**
   - Reversely look up the first path segment whose name is not empty and the segment is a model, union, or method.
   - Create the name with the model, union, or method's name, concatenating with all segments' names starting after that segment.
   - If a segment is an HTTP parameter, the concatenated name is `Request` + parameter name in PascalCase.
   - If a segment is an HTTP body parameter, the concatenated name is `Request`.
   - If a segment is an HTTP response header, the concatenated name is `Response` + header name in PascalCase.
   - If a segment is an HTTP response body, the concatenated name is `Response`.
   - If a segment is a method's parameter, the concatenated name is `Parameter` + parameter name in PascalCase.
   - If a segment is a model's additional property, the concatenated name is `AdditionalProperty`.
   - If a segment is a model's property, the concatenated name is the property name in PascalCase, and the property name is converted to singular if the property type is an array or dictionary.
