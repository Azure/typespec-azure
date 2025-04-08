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

## Client Type Graph

### Namespace

[`SdkPackage`](../reference/js-api/interfaces/sdkpackage/) represents a client package, containing all clients, operations, and types.

Clients, models, enums, and unions include namespace information. Emitters can use either:

- A flattened structure (`SdkPackage.clients`, `SdkPackage.enums`, `SdkPackage.models`, `SdkPackage.unions`)
- A hierarchical structure (`SdkPackage.namespaces`) requiring iteration through nested namespaces.

The `namespace` property in TCGC types indicates the type's namespace.

### License Information

The `licenseInfo` property in [`LicenseInfo`](../reference/js-api/interfaces/licenseinfo/) contains license details for client code comments or license file generation.

If `licenseInfo` is `undefined`, omit license information in the generated code or files.

Use `licenseInfo.name` (license name), `licenseInfo.company` (company name), `licenseInfo.link` (license document link), `licenseInfo.header` (header comments), and `licenseInfo.description` (license file content) directly when generating license-related content.

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

An [`SdkClientType`](../reference/js-api/interfaces/sdkclienttype/) represents a single client in the package.

### Method

TODO

### Operation

TODO

### Type

TODO
