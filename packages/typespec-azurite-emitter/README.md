# @azure-tools/typespec-azurite-emitter

Prototype TypeSpec emitter for generating the Queue server artifacts Azurite needs from a
compiled HTTP service plus an `azurite.tsp` overlay.

The package demonstrates a small but reusable emitter structure:

1. `src/build-model.ts` reads `@typespec/http` operations and TypeSpec models into an
   emitter-owned server model. Unsupported wire shapes are reported as emitter diagnostics rather
   than rendered as `unknown` or substituted defaults.
2. `src/render/` writes TypeScript files from that model:
   - `models.ts` — data-model interfaces plus colocated compact XML model descriptors.
   - `operations.ts` — request/response types plus colocated compact HTTP operation descriptors.
   - `metadata.ts` — a small service manifest that references the colocated descriptors without
     duplicating the mapping graph.
   - `handlers.ts` — handler interface methods with `(params, context)` signatures.
   - `serialization.ts` — a tiny binding from `metadata.ts` to Azurite's shared serialization
     runtime.

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
    runtimeImport: "../runtime/serializationRuntime" # optional, as emitted in generated TS
```

## Azurite overlays

An Azurite-owned overlay can import the shared Storage TypeSpec and apply emulator-specific
changes without editing the shared source. This package includes `@makeOptional` for required
properties that the emulator accepts as optional. It changes only Azurite's generated declarations and metadata; other emitters still see the original required properties.

```tsp
import "@azure-tools/typespec-azurite-emitter";
import "./main.tsp";

using Azurite;
using Storage.Queues;

@@makeOptional(Storage.Queues.AccessPolicy.start);
@@makeOptional(Storage.Queues.AccessPolicy.expiry);
@@makeOptional(Storage.Queues.AccessPolicy.permission);
```

Core TypeSpec augment decorators can be used for ordinary constraints when emulator semantics
intentionally differ from the shared source:

```tsp
@@minValue(Storage.Queues.CustomParameter.value, 0);
```

The emitter requires one HTTP service with at least one operation. It reports an error instead of writing incomplete artifacts for unsupported shapes such as cookie parameters, multipart/file bodies, status code ranges, or multiple content variants for a status. Unions retain their wire alternatives, including `null`. String enums carry their allowed wire values; numeric enum members are not supported.

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

1. Run Azurite's storage-context middleware before deserialization so route values are available on the Azurite runtime's request context.
2. Call `deserializeRequest(operationName, req, context)`, where the runtime context exposes path parameter values by generated name (for Queue today, `messageId`). The generated handler `Context` interface requires only `contextId`; handlers receive typed path values in `params`. The deserializer
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
and defaults to `../runtime/serializationRuntime` from the generated directory. That module must
export invariant metadata types (`OperationMetadata`, `OperationTypeBinding`,
`XmlModelMetadata`, and related binding types), compact descriptor helpers (`defineOperation`,
`defineXmlModel`, `defineServiceMetadata`), and `createSerializationRuntime(serviceMetadata)`,
which returns `deserializeRequest`, `serializeResponse`, and `hasGeneratedSerialization`. This
follows the same persistence principle as `http-client-js`: TypeScript interfaces are erased, so
wire knowledge is emitted as runtime values next to the declaration it describes. Header
collections are described generically with `collectionPrefix` metadata. The emitter currently recognizes only Storage's `x-ms-meta` header and emits the prefix `x-ms-meta-`. XML property descriptors also carry
requiredness and sparse numeric constraints (`min`, `max`, `minExclusive`, `maxExclusive`) so
malformed bodies and numeric path/query/header values can be rejected by the runtime before they
reach handlers or persistence. `metadata.ts` may export `operations` as a compatibility alias, but
it references `serviceMetadata.operations` and does not duplicate descriptor data.

**Runtime compatibility.** `defineServiceMetadata` receives `descriptorVersion: 2`. The compact positional tuples are intentional: Azurite consumes the same representation without a second copy of the mapping tables. The emitter exports `OperationDescriptor`, `OperationTypeDescriptor`, and `XmlModelDescriptor` for type-only imports by runtime authors. A runtime upgrading from the unversioned pilot must recognize the new datetime tuples, nullable literals and enum alternatives, validate enum inputs against the supplied literals, and reject unsupported descriptor versions. Update the handwritten handler bridge when regenerating: a dispatch name such as `Queue_Create` is unchanged in metadata but its TypeScript handler method is `queueCreate`.

Request descriptors carry the accepted content types. Response descriptors are `[statusCode, headers?, bodyType?, contentType?]`; an omitted content type for a body means `application/xml`. Use the XML property names, attributes and unwrapped lists **only for XML**. For other media types, use a matching serializer or reject the operation rather than serializing XML. The Queue pilot runtime parses JSON requests but does not serialize JSON model responses.

Default (`"*"`) responses describe status and headers only. Azurite's error middleware, not generated handlers, serializes the default Storage error XML body. Generated response-body metadata describes explicit success or error statuses; a status range is never widened to `"*"`.

Middleware/handler invocation code is intentionally not emitted by this package in the pilot: that
code is Azurite-owned integration logic, varies by storage service, and must compose with
Azurite's existing authentication, dispatch, error, and handler middleware.

## Current scope

This package is intentionally small. It covers the artifact shape and emitter architecture needed
for a Queue handoff, not a full Storage implementation. The [companion Azurite PR](https://github.com/Azure/Azurite/pull/2831) exercises the original, unversioned generated files against Azurite's real runtime. It includes query/header binding,
response-header serialization, and XML request/response body serialization for Queue operations
through shared helper functions instead of AutoRest-style mapper tables. Blob, Table/OData,
streaming, multipart bodies, service versioning, pagination, and numeric enums are outside this pilot.
