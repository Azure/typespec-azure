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
   - `serialization.ts` — ms-rest-compatible operation specs for the initial no-body Queue
     serializer/deserializer slice.

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
  what Azurite's Queue runtime needs to wire dispatch, handlers, and the first
  serializer/deserializer specs.

Run:

```bash
pnpm --filter @azure-tools/typespec-azurite-emitter test
pnpm --filter @azure-tools/typespec-azurite-emitter build
pnpm --filter @azure-tools/typespec-azurite-emitter lint
```

## Current scope

This package is intentionally small. It covers the artifact shape and emitter architecture needed
for a Queue handoff, not a full Storage implementation. The companion Azurite PR validates the
generated Queue files against Azurite's real runtime. It now includes a first
serializer/deserializer step for no-body Queue operations by generating ms-rest-compatible
operation specs that Azurite's existing helpers can consume. Full XML body mapper generation,
Blob, Table/OData, streaming, multipart bodies, versioning, pagination, and richer enum/union
rendering are future work.
