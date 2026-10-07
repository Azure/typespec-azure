# @azure-tools/typespec-azurite-emitter

Prototype TypeSpec emitter for generating the Queue server artifacts Azurite needs from a
compiled HTTP service plus an `azurite.tsp` overlay.

The package demonstrates a small but reusable emitter structure:

1. `src/build-model.ts` reads `@typespec/http` operations and TypeSpec models into an
   emitter-owned server model.
2. `src/render/` writes TypeScript files from that model:
   - `models.ts` — data-model interfaces.
   - `operations.ts` — request/response types plus route metadata.
   - `handlers.ts` — handler interface methods with `(params, context)` signatures.
   - `serialization.ts` — a thin binding that supplies XML model metadata to Azurite's shared
     serialization runtime.

## Usage

```bash
tsp compile . --emit @azure-tools/typespec-azurite-emitter
```

or in `tspconfig.yaml`:

```yaml
emit:
  - "@azure-tools/typespec-azurite-emitter"
options:
  "@azure-tools/typespec-azurite-emitter":
    outputDir: "." # optional, relative to the emitter output dir
    runtimeImport: "../runtime/serializationRuntime.js" # optional, as emitted in generated TS
```

## Azurite overlays

An Azurite-owned overlay can import the shared Storage TypeSpec and apply emulator-specific
changes without editing the shared source. This package includes `@makeOptional` for required
properties that the emulator accepts as optional:

```tsp
import "@azure-tools/typespec-azurite-emitter";
import "./main.tsp";

using Azurite;
using Storage.Queues;

@@makeOptional(Storage.Queues.AccessPolicy.start);
@@makeOptional(Storage.Queues.AccessPolicy.expiry);
@@makeOptional(Storage.Queues.AccessPolicy.permission);
```

Core TypeSpec augment decorators can be used for ordinary constraints, for example relaxing the
Queue visibility-timeout maximum in the overlay:

```tsp
@@maxValue(Storage.Queues.VisibilityTimeoutParameter.visibilityTimeout, 2147483647);
```

## Tests

- `test/build-model.test.ts` validates the intermediate model, including operation metadata,
  referenced models, `Record<T>`, anonymous models, operation-name collisions, and overlay
  changes.
- `test/render.test.ts` validates rendering from a hand-built server model.
- `test/e2e.test.ts` compiles the fixture through the emitter and checks the generated files.
- `test/azurite-compat.test.ts` checks that generated handler and route-metadata shapes contain
  what Azurite's Queue runtime needs to wire dispatch, handlers, and serialization.

Run:

```bash
pnpm --filter @azure-tools/typespec-azurite-emitter test
pnpm --filter @azure-tools/typespec-azurite-emitter build
pnpm --filter @azure-tools/typespec-azurite-emitter lint
```

## Azurite bridge contract

The emitter generates TypeSpec-derived artifacts only. Azurite still owns the runtime bridge that
selects a generated operation, calls the generated deserializer, invokes the handwritten handler,
and passes the handler result to the generated serializer. That bridge must:

1. Run Azurite's storage-context middleware before generated deserialization so route values are
   available on the generated `Context` object.
2. Call `deserializeRequest(operationName, req, context)`, where `context` exposes path parameter
   values by generated parameter name (for Queue today, `messageId`). The generated deserializer
   returns the exact generated `<Operation>Parameters` shape: parameter properties are flat, the
   request body is assigned to `body`, and query/header/path values use the same type conversion
   rules.
3. Invoke the generated handler interface as `(params, context) => Promise<Response>` with that
   parameters object directly; the bridge must select the handler method but must not reshape the
   request payload.
4. Call `serializeResponse(operationName, res, handlerResponse)` with the exact generated
   `<Operation>Response` union. Response headers are read from `handlerResponse.headers` while
   wire-name mapping remains in generated response metadata; the bridge must not flatten response
   headers before serialization.

Stable request deserialization, primitive conversion, XML body conversion, response serialization,
header collection handling, and generated-operation lookup live in an Azurite-owned handwritten
runtime imported by generated artifacts. The runtime module path is controlled by `runtimeImport`
and defaults to `../runtime/serializationRuntime.js` from the generated directory. That module must
export invariant metadata types (`OperationMetadata`, `OperationTypeBinding`,
`XmlModelMetadata`, and related binding types) plus
`createSerializationRuntime({ operations, xmlModels })`, which returns
`deserializeRequest`, `serializeResponse`, and `hasGeneratedSerialization`. Header collections are
described generically with `collectionPrefix` metadata (for example `x-ms-meta-`), not with
Queue-specific runtime special cases.

Middleware/handler invocation code is intentionally not emitted by this package in the pilot: that
code is Azurite-owned integration logic, varies by storage service, and must compose with
Azurite's existing authentication, dispatch, error, and handler middleware.

## Current scope

This package is intentionally small. It covers the artifact shape and emitter architecture needed
for a Queue handoff, not a full Storage implementation. The companion Azurite PR validates the
generated Queue files against Azurite's real runtime. It includes query/header binding,
response-header serialization, and XML request/response body serialization for Queue operations
through shared helper functions instead of AutoRest-style mapper tables. Blob, Table/OData,
streaming, multipart bodies, versioning, pagination, and richer enum/union rendering are future
work.
