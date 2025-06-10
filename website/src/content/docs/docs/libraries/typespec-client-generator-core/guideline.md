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

[`SdkClient`](../reference/js-api/interfaces/sdkclient/) represent a client and [`SdkOperationGroup`](../reference/js-api/interfaces/sdkoperationgroup/) represents a sub client.
Emitter could use [`listClients`](../reference/functions/listclients/) to get all the root clients calculated from current spec. Then emitter could use [`listOperationGroups`](../reference/functions/listoperationgroups/) to get all the sub clients under one root client or sub client. Finally emitter could use [`listOperationsInOperationGroup`](../reference/functions/listoperationsinoperationgroup/) to get all the operations under one client or sub client.

For these helper functions, the return type is either TCGC raw types or TypeSpec core types.

## Client Type Graph

Unlike TCGC raw types and helpers. Client type graph is a calculated complete type graph represents your spec. Emitter could use it to get all client info without calling any extra works. It is recommended to use this type graph instead of calculating all client related logic with TCGC raw types or TypeSpec core types.

### Common Properties

- The `namespace` property in TCGC types indicates the type's namespace.
- The `doc` and `summary` properties in TCGC types indicates the doc related info.
- The `apiVersions` property in TCGC types indicates for which versions the type is exist.
- The `decorators` property in TCGC types stores all TypeSpec decorator info for advanced use cases.
- The `crossLanguageDefinitionId` property in TCGC types indicates a unique ID for a TCGC type that could be use to do output mapping for different emitters.
- The `name` property, and sometimes along with `isGeneratedName` in TCGC types indicates the type's name, and whether the name is created by TCGC.
- The `access` property in TCGC types indicates whether the type has public or private accessibility.
- The `usage` property in TCGC types indicates the type's all kinds of usage info; its value is a bit map of [`UsageFlags`](../reference/enumerations/usageflags/) enumeration.
- The `deprecation` property in TCGC types indicates whether the type is deprecated and what is the deprecation message.
- The `clientDefaultValue` property in TCGC types indicates the type's default value if provided. Currently, it only exists in endpoint and API version parameters.

### Package

[`SdkPackage`](../reference/js-api/interfaces/sdkpackage/) represents a client package, containing all clients, operations, and types.

Clients, models, enums, and unions include namespace information. Emitters can use either:

- A flattened structure (`SdkPackage.clients`, `SdkPackage.enums`, `SdkPackage.models`, `SdkPackage.unions`)
- A hierarchical structure (`SdkPackage.namespaces`) requiring iteration through nested namespaces.

### License Information

Emitter could get package license info from `SdkPackage.clients`. The [`LicenseInfo`](../reference/js-api/interfaces/licenseinfo/) contains license details for client code comments or license file generation.

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

Emitter could get first level clients of a client package from `SdkPackage.clients`. An [`SdkClientType`](../reference/js-api/interfaces/sdkclienttype/) represents a client in the package. Emitter could use `SdkClientType.children` to get nested sub clients, and use `SdkClientType.parent` to trace back.

`SdkClientType.clientInitialization` tells emitter how to initialize the client. [`SdkClientInitializationType`](../reference/js-api/interfaces/sdkclientinitializationtype/) contains info about the client's initialization parameters and how the client could be initialized: by parent client or by self.

The initialization parameter could be either [`SdkEndpointParameter`](../reference/js-api/interfaces/sdkendpointparameter/), [`SdkCredentialParameter`](../reference/js-api/interfaces/sdkcredentialparameter/) or [`SdkMethodParameter`](../reference/js-api/interfaces/sdkmethodparameter/).

`SdkEndpointParameter` is a parameter of endpoint for the client API. `SdkEndpointParameter.type` tells how to compose the endpoint. It could be a [`SdkEndpointType`](../reference/js-api/interfaces/sdkendpointtype/) type or union of `SdkEndpointType` type if there are multiple ways to compose the endpoint. `SdkEndpointType.serverUrl` is the base string of the endpoint while `SdkEndpointType.templateArguments` is the template arguments used in the `SdkEndpointType.serverUrl` if exist.

`SdkCredentialParameter` is a parameter of how to authorize the client. `SdkCredentialParameter.type` is the deatil of the authorizations. It could be a [`SdkCredentialType`](../reference/js-api/interfaces/sdkcredentialtype/) type or union of `SdkCredentialType` type if there are multiple ways to authorize the client. `SdkCredentialType.scheme` is the scheme of authorization method. Currently, TCGC currently only support [`HttpAuth`](https://typespec.io/docs/libraries/http/reference/js-api/type-aliases/httpauth/).

`SdkMethodParameter` is the normal client level parameter that could be used in some of the method's belong to the client. The type detail could refer next part.

### Method

Emitters get all methods belong to a client with `SdkClientType.method`. An [`SdkServiceMethod`](../reference/js-api/type-aliases/sdkmethod/) represent a client's method.

TCGC has supported four kinds of methods: [`SdkBasicServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/), [`SdkPagingServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/), [`SdkLroServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/), and [`SdkLroPagingServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/).

`SdkBasicServiceMethod` is a basic method that call a synchronous server side API. It contains flags to indicate if how the client signature should be generated, and the input and output of the method.

`SdkBasicServiceMethod.parameters` is the method's input. Its type [`SdkMethodParameter`](../reference/js-api/interfaces/sdkmethodparameter/) contains type of the parameter along with some attributes of the parameter.

`SdkBasicServiceMethod.response` is the method's normal response while `SdkBasicServiceMethod.exception` is the method's error response.

`SdkPagingServiceMethod` is a paging method that has pageable responses. It extends `SdkBasicServiceMethod` and contains extra paging infomation.

`SdkLroServiceMethod` is an LRO method that call a long running server side API. It extends `SdkBasicServiceMethod` and contains extra LRO infomation.

`SdkLroPagingServiceMethod` is an LRO method that call a long running server side API and has pageable responses. It extends `SdkBasicServiceMethod`, `SdkPagingServiceMethod` and `SdkLroServiceMethod`.

### Operation

TCGC separates the client level operation and the protocol level operation. This way, TCGC are able to abstract away the protocol used to call the service (i.e. `HTTP` or `gRPC`).
Emitters could get the protocol level operation from `SdkServiceMethod.operation`. An [`SdkServiceOperation`](../reference/js-api/type-aliases/sdkserviceoperation/) represent a protocol operation.

TCGC has supported one kind of operation: [`SdkHttpOperation`](../reference/js-api/interfaces/sdkhttpoperation/).

`SdkHttpOperation` contains verb, path, URI template, query/header/path/cookie/body parameters, responses, exceptions of an Http operation.

Each parameter for an Http operation has a `correspondingMethodParams` to indicate the mapping of one payload parameter with one or more method level parameter or model property. It could help emitter to determine how to compose the underlying payload with method's parameter. One body parameter could have several method level parameter or model property mapping because of the implicit body parameter resolving from TypeSpec Http library.

### Type

For types in TypeSpec, TCGC has a couple of client types to represent them to make the type more similar to client languages.

A [`SdkBuiltInType`](../reference/js-api/interfaces/sdkbuiltintype/) represents a built-in scalar TypeSpec type or scalar type that derives from a built-in scalar TypeSpec type, but `utcDateTime`, `offsetDateTime` and `duration` are not included. We add `encode` onto these types if `@encode` decorator exists, telling us how to encode when sending to the service.

[`SdkDateTimeType`](../reference/js-api/type-aliases/sdkdatetimetype/) and [`SdkDurationType`](../reference/js-api/interfaces/sdkdurationtype/) types converted from TypeSpec `utcDateTime`, `offsetDateTime` and `duration` types.

[`SdkArrayType`](../reference/js-api/interfaces/sdkarraytype/), [`SdkTupleType`](../reference/js-api/interfaces/sdktupletype/) and [`SdkDictionaryType`](../reference/js-api/interfaces/sdkdictionarytype/) types converted from TypeSpec `Array`, `Tuple` and `Record` types.

[`SdkNullableType`](../reference/js-api/interfaces/sdknullabletype/) type represents a type whose value could be null. The actual type for it is in `SdkNullableType.type`.

[`SdkEnumType`](../reference/js-api/interfaces/sdkenumtype/) and [`SdkEnumValueType`](../reference/js-api/interfaces/sdkenumvaluetype/) types represent TCGC enumeration types. They are typically converted from TypeSpec `enum` types or `union` types (for extensible enumeration cases).

[`SdkConstantType`](../reference/js-api/interfaces/sdkconstanttype/) type represents a literal type in TypeSpec (`StringLiteral`, `NumericLiteral`, or `BooleanLiteral`).

[`SdkUnionType`](../reference/js-api/interfaces/sdkuniontype/) type represents a TCGC union type. It is typically converted from a TypeSpec `union` type.

[`SdkModelType`](../reference/js-api/interfaces/sdkmodeltype/) type represents a TCGC model type. It is typically converted from a TypeSpec `model` type.

### Example types

Example types help model the examples that TypeSpec authors define to help users understand how to use the API. TCGC currently only supports examples based on HTTP payload, so the examples are available in `SdkHttpOperation.examples`.

[`SdkHttpOperationExample`](../reference/js-api/interfaces/sdkhttpoperationexample/) represents an example. [`SdkHttpParameterExampleValue`](../reference/js-api/interfaces/sdkhttpparameterexamplevalue/), [`SdkHttpResponseExampleValue`](../reference/js-api/interfaces/sdkhttpresponseexamplevalue/), and [`SdkHttpResponseHeaderExampleValue`](../reference/js-api/interfaces/sdkhttpresponseheaderexamplevalue/) represent HTTP parameter, response body, and response header examples. Each type contains the example value and its corresponding definition type.

[`SdkExampleValue`](../reference/js-api/type-aliases/sdkexamplevalue/) represents an example value of different types. All related types are used to represent the example value of a definition type. One definition type may have different example value types.

For [`SdkUnionExampleValue`](../reference/js-api/interfaces/sdkunionexamplevalue/), since it is difficult to determine which union variant the example value should belong to, TCGC preserves the raw value and leaves this determination to the emitter.

For [`SdkModelExampleValue`](../reference/js-api/interfaces/sdkmodelexamplevalue/), TCGC helps map the example type to the correct subtype for discriminated types and separates additional property values from property values. However, for models with inheritance, TCGC does not break down the type graph but instead places all example values in the child model.

## Client Type Calculation Logic

### Client Detection

The clients depend on the combination usage of `Namespace`, `Interface`, `@service`, `@client`, `@operationGroup` and `@moveTo`.

If there is no explicitly defined `@client` or `@operationGroup`, then the first namespaces with `@service` is a root client. The nested namespaces and interfaces under that namespace is a sub client with hierarchy. Meanwhile, any operations with `@moveTo` a `string` type target, is a sub client under the root client.

If there is any `@client` definition or `@operationGroup` definition, then each `@client` is a root client and each `@operationGroup` is a sub client with hierarchy.

If a detected client or sub client does not contain any sub client or operation, then this client is ignored.

### Client Initialization Creation

Normally, a client's initialization parameters include:

1. Endpoint parameter: it is converted from `@server` definition on the service the client belong to.

- If the server URL is a constant, TCGC returns a templated endpoint with a default value of the constant server URL.
- When the endpoint has additional template arguments, the type is a union of a completely-overridable endpoint and an endpoint that accepts template arguments.
- If there are multiple servers, TCGC returns the union of all possibilities.

2. Credential parameter: it is converted from `@useAuth` definition on the service the client belong to.
3. API version parameter: if the service is versioned, then the API version parameter on method is elevated to client.

- The API version parameter is detected by parametere name (`api-version` or `apiversion`) or parameter type (API version enum type used in `@versioned` decorator).

4. Subscription ID parameter: if the service is an ARM service, then the subscription ID parameter on method is elevated to client.

The client's initialization way is `undefined`. Emitter could choose how to initialize all the clients.

With `@clientInitialization` decorator, the default behavior may change. New client level parameters are added. Client initialization way could be specified with initializing by parent client, initializing individually or both.

### Method Detection

The methods depend on the combination usage of `Operation`, `@scope` and `@moveTo`.

A client's operation included the `Operation` under the client's `Namespace` or `Interface`, adding any operations with `@moveTo` current client, deducting any operations with `@scope` out of current emitter or `@moveTo` another client.

### Method Parameters Handling

If `@override` is used for the method, the parameters are handled by the target method.

Parametes used in client (either API version parameter or client parameter defined in `@clientInitialization`) are filtered from method parameter list.

### Method Return Type Calculation

The method's return type is determined on the underlaying operation's normal responses:

- If `@responseAsBool` is on the method, then the response is a boolean.
- If the responses contains multiple return types, the return type is a union of all the types.
- If the responses contains empty return type, the return type is wrapped with a nullable type.

The paging method's return type is an array type of the page items type. It is inferred from `@pageItems` or `@items` decorator.

The LRO method's return type is the final response type. It is inferred from `LroMetadata`.

### Http Operation Parameters Handling

The Http operation's parameters is inferred from TypeSpec Http lib type [`HttpOperationParameters`](https://typespec.io/docs/libraries/http/reference/js-api/interfaces/httpoperationparameters/). Different Http parameter is handled by specific logic based on the info from TypeSpec Http lib type [`HttpOperationParameter`](https://typespec.io/docs/libraries/http/reference/js-api/type-aliases/httpoperationparameter/).

TCGC inferred the body parameter type from TypeSpec Http lib type [`HttpOperationBody`](https://typespec.io/docs/libraries/http/reference/js-api/interfaces/httpoperationbody/). If the body is explicitly defined, TCGC uses the type directly as the body type. If not, TCGC treats the body parameter as spread case. For such body type, TCGC tries to get back the original model if all the spread properties is from one model. Otherwise, TCGC create a new model type for the body parameter.

TCGC creates the `Content-Type` header parameter for any operation with body parameter if not exist, and crates the `Accept` header parameter for any operation with response that contains body. TCGC also create corresponding method parameter for the operation's upper layer method for each cases.

TCGC uses several ways to find an Http operation's parameter's corresponding method parameter or model property:

- To see if the parameter is a client level method parameter.
- To see if the parameter is API version parameter that has been elevated to client.
- To see if the parameter is subscription parameter that has been elevated to client (only for ARM service).
- To see if the parameter is a method parameter or a property of a method parameter (nested Http metadata case when using `@bodyRoot`).
- To see if all the property of the parameter could be mapped to a method parameter or a property of a method parameter (spread).

### Http Operation Response Calculation

The response is inferred from TypeSpec Http lib type [`HttpOperationResponse`](https://typespec.io/docs/libraries/http/reference/js-api/interfaces/httpoperationresponse/).

For each response, TCGC will check the response's content. If contents from different response are not equal, TCGC takes the last one as the response type. Any response with `*` status code or response content type has `@error` decorator, TCGC put them into the exception response list. Others are put in the response list.

If `@responseAsBool` is on the operation's upper level method, the `404` status code is always recognized as normal response.

### Type Traversal Logic

### Access Calculation

### Usage Calculation

### Naming Logic for Anonymous Model
