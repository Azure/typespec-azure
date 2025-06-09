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

In order to introduce the client concept in TCGC, we introduced some raw types and helper functions in TCGC.

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

### Method

Emitter get all methods belong to a client with `SdkClientType.method`. An [`SdkServiceMethod`](../reference/js-api/type-aliases/sdkmethod/) represent a client's method.

TCGC has supported four kinds of methods: [`SdkBasicServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/), [`SdkPagingServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/), [`SdkLroServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/), and [`SdkLroPagingServiceMethod`](../reference/js-api/interfaces/sdkbasicservicemethod/).

`SdkBasicServiceMethod` is a basic client method that call a synchronous server side API.

### Operation

TCGC separate the client level operation and the protocol level operation. This way, TCGC are able to abstract away the protocol used to call the service (i.e. `HTTP` or `gRPC`).
Emitter could get the protocol level operation from `SdkServiceMethod.operation`. An [`SdkServiceOperation`](../reference/js-api/type-aliases/sdkserviceoperation/) represent a protocol operation.

TCGC has supported one kind of operation: [`SdkHttpOperation`](../reference/js-api/interfaces/sdkhttpoperation/).

### Type

## Client Type Calculation Logic

### Client Detection

### Client Initialization Creation

### Method Detection

### Method Parameters Handling

### Basic Method Return Type Calculation

### Paging Method Return Type Calculation

### LRO Method Return Type Calculation

### Http Operation Parameters Handling

### Http Operation Body Parameter Handling

### Http Operation Response Calculation

### Http Operation Exception Calculation

### Type Traversal Logic

### Access Calculation

### Usage Calculation

### Naming Logic for Anonymous Model
