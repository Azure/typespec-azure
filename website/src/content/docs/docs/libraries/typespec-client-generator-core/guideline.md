---
title: Guideline for client emitter
---

This document will guide you on how to use the TypeSpec Client Generator Core (TCGC) in client emitters.
TCGC is a library that introduces a client type graph and provides useful helper functions for client emitters to generate client code.
Client emitters do not need to interact with the TypeSpec core API directly; they can use the client type graph to obtain enough information to generate client code.

## TCGC library

TCGC is aimed to abstract common info and logic from all languages' client emitters that languages' emitters only need to care about the language code generation.

### How to use

If you want to use TCGC, you need to add TCGC package in your `package.json` file.

```json
{
  "dependencies": {
    "@azure-tools/typespec-client-generator-core": "latest"
  }
}
```

Then in your emitter's `$onEmit` entrance, you need to call [`createSdkContext`](../reference/js-api/functions/createsdkcontext/) to transfer [`EmitContext`](https://typespec.io/docs/standard-library/reference/js-api/interfaces/emitcontext/) to [`SdkContext`](../reference/js-api/interfaces/sdkcontext/). The [`SdkContext.SdkPackage`](../reference/js-api/interfaces/sdkpackage/) contains all client type graph. Please refer the ["Client type graph"](#client-type-graph) for details.

Normally, client emitter will have its options or global variables, so you should define your own emitter context that extends [`SdkContext`](../reference/js-api/interfaces/sdkcontext/). See code example:

```ts
import { EmitContext } from "@typespec/compiler";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";

interface PythonEmitterOptions extends SdkEmitterOptions {
  // client emitter's option
}

interface PythonSdkContext extends SdkContext<PythonEmitterOptions> {
  // client emitter's global variables
}

export async function $onEmit(context: EmitContext<PythonEmitterOptions>) {
  const emitterContext: PythonSdkContext = {
    ...createSdkContext(context),
    // initialize client emitter's global variables
  };
}
```

### Output TCGC type graph

TCGC could be used as a separated emitter to export TCGC type graph file, which is sometimes useful for client emitters to do debugging. You could use `tsp compile . --emit=@azure-tools/typespec-client-generator-core --options=@azure-tools/typespec-client-generator-core.emitter-name="<emitter-name>"` with specific `<emitter-name>` to get the type graph file directly.
Also, the client emitter could pass [`exportTCGCoutput`](../reference/js-api/interfaces/createsdkcontextoptions/) option when [`createSdkContext`](../reference/js-api/functions/createsdkcontext/) to get the type graph file (`<output-dir>/tcgc-output.yaml`) along with generating client code.

### TCGC playground

[TCGC playground](https://azure.github.io/typespec-azure/playground/?e=%40azure-tools%2Ftypespec-client-generator-core) is useful when debugging for experimenting how the spec will translate to TCGC client type graph. Please attach the playground when you ask questions in channel, or open issues in GitHub.

### TCGC flags

TCGC provide some flags for customer to control the client type graph style, for example, whether generate convenience API. Please refer the [doc](../reference/emitter/#emitter-options) for details.

## Client type graph

### Namespace

[`SdkPackage`](../reference/js-api/interfaces/sdkpackage/) represents a client package. It contains all clients, operations and types information.

Clients, models, enums, and unions all have namespace info. Client emitter could choose using the flattened structure (`SdkPackage.clients`/`SdkPackage.enums`/`SdkPackage.models`/`SdkPackage.unions`) which contains all namespaces' types, or namespace hierarchy based structure (`SdkPackage.namespaces`) which needs to iterate the nested namespaces, to generate client codes.

Clients, models, enums, and unions type in TCGC all has `namespace` property that indicate client emitter about the type's namespace.

### License Info

The `licenseInfo` property of the [`LicenseInfo`](../reference/js-api/interfaces/licenseinfo/) type in `SdkPackage` contains the license information to be used for client code license comments or license file generation.

If `licenseInfo` is `undefined`, no license information should be included in the generated client code or separate license file.

Client emitters should use `licenseInfo.name` (license name), `licenseInfo.company` (company name), `licenseInfo.link` (link to the official license document), `licenseInfo.header` (license sentences for code header comments), and `licenseInfo.description` (license sentences for separate license file) directly when generating license information in configuration files, code files, or license files. Client emitters do not need to handle how the license information is configured.

For Azure services, client emitters should hard-code the `license.name` configuration to `MIT License` and `license.company` configuration to `Microsoft Corporation` when calling `createSdkContext`.

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

An [`SdkClientType`](../reference/js-api/interfaces/sdkclienttype/) represents a single client in your package.

### Method

TODO

### Operation

TODO

### Type

TODO
