---
title: Guidele for client emitter
---

This document will guide you on how to use the TypeSpec Client Generator Core (TCGC) in client emitters.
TCGC is a library that introduces a client type graph and provides useful helper functions for client emitters to generate client code.
Client emitters do not need to interact with the TypeSpec core API directly; they can use the client type graph to obtain enough information to generate client code.

## Basic concepts

TODO

## TCGC options

TODO

## Client type graph

### Package

[`SdkPackage`](../reference/js-api/interfaces/sdkpackage/) represents a client package. It contains all clients and types information in either a flattened structure or a namespace hierarchy. It also includes common information useful for client code generation.

### License Info

The `licenseInfo` property of the [`LicenseInfo`](../reference/js-api/interfaces/licenseinfo/) type in `SdkPackage` contains the license information to be used for client code license comments or license file generation.

Client emitters should use `licenseInfo.name` (license name), `licenseInfo.link` (link to the official license document), `licenseInfo.header` (license sentences for code header comments), and `licenseInfo.description` (license sentences for separate license file) directly when generating license information in configuration files, code files, or license files. If `licenseInfo` is `undefined`, no license information should be included in the client code generation. Client emitters do not need to handle how the license information is configured.

For Azure services, client emitters should hard-code the `license.name` configuration to `MIT License` when calling `createSdkContext`.

```typescript
export async function $onEmit(context: EmitContext<SdkEmitterOptions>) {
  context.options.license = {
    name: "MIT License",
  };
  const sdkContext = await createSdkContext(context);
  // ...
}
```

### Client

TODO

### Method

TODO

### Operation

TODO

### Type

TODO
