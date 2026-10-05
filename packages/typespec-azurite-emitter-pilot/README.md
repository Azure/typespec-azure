# @azure-tools/typespec-azurite-emitter-pilot

**This is a pilot/prototype, not a production emitter.** It exists to prove out, end to end, an
architecture for replacing Azurite's (the Azure Storage emulator's) AutoRest-based server code
generation with a TypeSpec emitter that Azurite owns.

## Background

Azurite currently copies the Storage Swagger, patches it, and runs AutoRest with a custom
C#-based server generator to produce handler interfaces, models, mappers, and routing metadata
that its hand-written runtime consumes. AutoRest generation is deprecated. The proposed
replacement is an Azurite-owned TypeSpec emitter that imports the **existing, unchanged** Azure
Storage TypeSpec plus a new `azurite.tsp` overlay describing emulator-specific adaptations.

This package demonstrates that pattern on a minimal, self-contained fixture, modeled structurally
on the [GraphQL emitter](https://github.com/microsoft/typespec/tree/main/packages/graphql) in
microsoft/typespec: a **transform** phase that walks `@typespec/http` metadata into an
emitter-owned intermediate "server model", followed by a **render** phase that turns that model
into generated TypeScript.

## What it demonstrates

- **Transform-then-render architecture.** [`src/build-model.ts`](./src/build-model.ts) walks the
  compiled program's `HttpService`/`HttpOperation`s (via `@typespec/http`'s `getAllHttpServices`)
  and TypeSpec `Model`/`Scalar`/`Enum` types into a small, emitter-owned intermediate
  representation ([`src/model.ts`](./src/model.ts)) that is fully decoupled from `@typespec/http`'s
  exact shapes. [`src/render/`](./src/render) turns that model into TypeScript source via plain
  string templates (no Alloy/JSX — see [Design notes](#design-notes)).
- **Three generated artifacts per service**, analogous to Azurite's existing generated-code
  boundary:
  - `models.ts` — a TS interface per request/response data model.
  - `operations.ts` — per-operation parameter/response TS types plus a runtime route-binding
    metadata table (verb, path, parameter locations, request body content types).
  - `handlers.ts` — one `IServiceHandler` interface with a method per operation, which a server
    implementor (Azurite) fills in with real emulator behavior.
- **The overlay pattern.** [`test/fixtures/queue-pilot/azurite.tsp`](./test/fixtures/queue-pilot/azurite.tsp)
  imports the unchanged [`base.tsp`](./test/fixtures/queue-pilot/base.tsp) fixture and layers
  emulator-specific documentation onto it using plain core augment decorators (`@@doc`), without
  modifying the base file. The end-to-end test confirms the overlay's documentation flows through
  into the generated output.
- **Representative HTTP shapes**: query-string parameters (`listMessages`), a JSON request body
  (`createQueue`), and a custom response header (`getQueueProperties`'s
  `x-ms-approximate-messages-count`).
- **Structural fit against the real Azure/Azurite repo.** [`test/azurite-compat.test.ts`](./test/azurite-compat.test.ts)
  compares our generated artifacts against Azurite's actual (AutoRest-generated) equivalents,
  fetched from `Azure/Azurite`'s `main` branch:
  `src/queue/generated/handlers/IQueueHandler.ts`,
  `src/queue/generated/middleware/dispatch.middleware.ts`,
  `src/queue/generated/artifacts/{parameters,specifications,operation}.ts`, and
  `src/queue/generated/Context.ts`. It asserts our `handlers.ts`/`operations.ts` carry the same
  _categories_ of information Azurite's real dispatcher/handler boundary relies on (HTTP
  method+path template, per-parameter wire name/location/required-ness, per-status-code response
  headers, a trailing per-request context argument on handler methods) — see that test file's
  header comment for the exact citations. Comparing against the real repo, and later wiring a
  real hand-written Express dispatcher against the generated metadata for the companion
  Azure/Azurite end-to-end PR, surfaced three concrete gaps versus our first draft, all closed in
  this pilot (see below) rather than left silent.

## Gaps found (and closed) while comparing against the real Azurite repo

- **Handler methods were missing a trailing context argument.** Azurite's real handler methods
  (e.g. `IQueueHandler.create`) take `(options, context)`, not just `options` — the `context`
  carries per-request state (matched operation, raw request/response). `handlers.ts` now
  generates a minimal placeholder `Context` type and every method takes
  `(params: XParameters, context: Context)`.
- **Route metadata was missing `required`/per-status response info.** Azurite's dispatcher
  (`dispatch.middleware.ts`) disambiguates between operations sharing a path/verb using which
  query/header parameters are _required_, and its `OperationSpec.responses` are keyed by status
  code with a header mapper per status. `operations.ts`'s `OperationParameterBinding` now
  includes `required`, and `OperationMetadata` now includes a `responses` array with
  `statusCode`/`headers` (name + wire name) per response.
- **Response header metadata was missing the TS property name.** Found while wiring a real
  hand-written Express dispatcher against this metadata for the companion Azure/Azurite
  end-to-end PR: a dispatcher translating a handler's typed result (e.g.
  `{ approximateMessagesCount: 0 }`) into a real HTTP header (`x-ms-approximate-messages-count`)
  needs both names, not just the wire name. `OperationResponseMetadata.headers` is now
  `{ name, wireName }[]` instead of a bare `headerWireNames: string[]`.

## Real-spec compatibility: the unchanged Azure Storage Queue TypeSpec

Beyond the toy `queue-pilot` fixture above, this pilot also vendors the **real, byte-for-byte
unchanged** Azure Storage Queue TypeSpec from `azure-rest-api-specs` into
[`test/fixtures/storage-queue-real/`](./test/fixtures/storage-queue-real) (see that directory's
[`PROVENANCE.md`](./test/fixtures/storage-queue-real/PROVENANCE.md) for the exact source commit
and what was omitted — examples, `readme.md`, `service.yaml`, etc. — none of which this emitter
needs), plus a real [`azurite.tsp`](./test/fixtures/storage-queue-real/azurite.tsp) overlay
demonstrating genuine, documented Azurite customizations cited from
[`Azure/Azurite`'s `swagger/queue.md`](https://github.com/Azure/Azurite/blob/main/swagger/queue.md).
This is the strongest evidence in this pilot that the transform-then-render architecture holds up
against a real spec, not just an internally-consistent toy fixture — see
[`test/real-queue-spec.test.ts`](./test/real-queue-spec.test.ts) for the tests backing every claim
below.

**Result: all 17 real Queue operations (`Service` + `Queue` interfaces) build and render with zero
diagnostics and zero skipped operations**, after fixing three concrete gaps the toy fixture never
exercised:

1. **`Record<T>` dictionary properties.** `QueueItem.metadata` (a `Record<string>`) was being
   routed through the generic named-model registration path and rendered as an empty
   `interface Record {}` instead of `Record<string, string>`. Fixed by checking
   `isRecordModelType` in `toTypeRef` before the generic-model fallback, and adding a
   `{ kind: "record"; element: ServerTypeRef }` `ServerTypeRef` variant.
2. **Anonymous-model identity collisions.** Every `StorageOperation*` template instantiation
   contributes its own distinct anonymous TypeSpec `Model` object for its `{code, message}`-shaped
   error response body. The toy fixture's error bodies all happened to be identical, so keying the
   anonymous-model cache by `model.name` (empty string for all of them) silently coalesced them
   into one shared entry — harmless by coincidence there, but a latent bug for genuinely different
   anonymous shapes. Fixed by keying the cache by TypeSpec object identity
   (`Map<Model, string>`) instead, each distinct anonymous model now getting its own
   `AnonymousModelN` name.
3. **Real operation-name collisions.** `Service.getProperties` and `Queue.getProperties` both
   PascalCase to `GetProperties`, which produced a genuine `TS2300: Duplicate identifier` in the
   generated `operations.ts`/`handlers.ts` (confirmed with a standalone `tsc --strict` check of the
   rendered output). Fixed by qualifying a colliding operation's name with its containing
   TypeSpec interface name (e.g. `QueueGetProperties`), falling back to a numeric suffix if that's
   still not unique.

**Overlay findings**, following Azurite's own documented `swagger/queue.md` changes:

- ✅ **"Remove maximum limitation for `VisibilityTimeout`" (first use site, `sendMessage`) works.**
  `sendMessage`'s `visibilityTimeout` parameter is spread in from the shared
  `VisibilityTimeoutParameter` alias, which carries `@maxValue(604800)` in the real spec. A plain
  `@@maxValue(Storage.Queues.VisibilityTimeoutParameter.visibilityTimeout, 2147483647)` in
  `azurite.tsp` overrides it — `getMaxValue()` on the compiled program confirms the new value wins,
  proving augment decorators can **relax**, not just add, a constraint from an unchanged shared
  base spec. This is the core mechanism the real overlay design depends on.
- ⚠️ **Same change, second use site (`updateMessage`'s own `visibilityTimeout`) is an open gap, not
  silently papered over.** Azurite's note also covers `updateMessage`'s separately-declared,
  required `visibilityTimeout` parameter (not spread from the shared alias). Targeting it via
  `Storage.Queues.Queue.updateMessage::parameters.visibilityTimeout` fails with
  `invalid-ref: Model doesn't have member visibilityTimeout`, because `updateMessage` is declared
  as `op updateMessage is StorageOperationNoBody<{...}, {...}>` (a template instantiation), and the
  `::parameters` reflection accessor appears to resolve against the template's own declared
  parameter list rather than the fully-substituted operation members a dispatcher/handler actually
  sees. `test/real-queue-spec.test.ts` has a test pinning down that this parameter's `@maxValue`
  is still `604800` today, specifically so this gap can't silently regress-fixed without updating
  this note. **Future work**: find the correct reflection syntax for templated/`is`-defined
  operation parameters, or add a small first-class "parameter override" overlay decorator to this
  emitter itself if TypeSpec's own reflection genuinely can't express it.
- ✳️ **"Remove `required` section from `AccessPolicy`" is already moot.** The current vendored
  `models.tsp`'s `AccessPolicy` model already declares `start`/`expiry`/`permission` as optional —
  nothing to demonstrate or override here against this particular spec revision.

## Usage

```bash
tsp compile . --emit @azure-tools/typespec-azurite-emitter-pilot
```

or in `tspconfig.yaml`:

```yaml
emit:
  - "@azure-tools/typespec-azurite-emitter-pilot"
options:
  "@azure-tools/typespec-azurite-emitter-pilot":
    outputDir: "." # optional, relative to the emitter output dir
```

## Tests

- `test/build-model.test.ts` — unit tests for the transform phase: given the compiled fixture
  program, asserts the intermediate server model has the right operations, parameter bindings,
  request/response bodies, headers, and referenced models (including overlay-applied docs).
- `test/render.test.ts` — assertion-based tests for the render phase against a hand-built
  `ServerModel`, independent of the TypeSpec compiler.
- `test/e2e.test.ts` — a true end-to-end test: compiles the fixture (base + azurite overlay) with
  the emitter via `@typespec/compiler/testing`'s `createTester`, and asserts all three generated
  files exist and contain the expected generated code.
- `test/azurite-compat.test.ts` — structural fit-check against the real `Azure/Azurite` repo (see
  above), citing the specific files/behaviors compared against.
- `test/real-queue-spec.test.ts` — builds and renders the real, unchanged Azure Storage Queue
  TypeSpec plus its `azurite.tsp` overlay (see "Real-spec compatibility" above): asserts all 17
  operations build with zero skips, the three concrete real-spec gaps stay fixed (`Record<T>`,
  anonymous-model identity, operation-name collisions), the overlay's `@@maxValue` relaxation
  takes effect, and the one open overlay gap (`updateMessage`'s own `visibilityTimeout`) stays
  honestly pinned down rather than silently regressing.

Run with `pnpm test` from this package's directory (or `pnpm --filter
@azure-tools/typespec-azurite-emitter-pilot test` from the repo root).

## Design notes / decisions made for this pilot

- **Plain TypeScript string templates instead of Alloy/JSX.** This was checked against both
  real examples the task pointed at, not just asserted:
  - `@typespec/graphql`'s `src/emitter.tsx` (microsoft/typespec) does **not** actually render
    TypeScript with Alloy. It renders a `graphql.GraphQLSchema` object via the domain-specific
    `@pinterest/alloy-graphql` renderer, then serializes it to SDL text with `graphql`'s own
    `printSchema()`. Its `@alloy-js/core`/`@alloy-js/typescript` dependencies exist for a
    different reason (its `.tsp` extern-signature generation plumbing), not for printing the
    `.graphql` output file this emitter actually produces.
  - `@typespec/http-client-js` (core/packages/http-client-js) **is** a real Alloy/TSX-based
    TypeScript emitter, and its components (`src/components/models.tsx`,
    `client-operation.tsx`, etc.) are where Alloy's value actually shows up: `refkey`/
    `<ts.Reference>`-based cross-file symbol resolution (so declarations can reference each
    other without hand-rolled import tracking), `<ts.PackageDirectory>` / `<SourceDirectory>`
    for a multi-directory package layout, and deep integration with TCGC's type system via
    `@typespec/emitter-framework`'s `TypeExpression`/`useTsp()` to render arbitrary TypeSpec
    model/union/enum shapes.
  - This pilot's output is 3 flat files (`models.ts`, `operations.ts`, `handlers.ts`) built from
    a small custom intermediate "server model" — not TCGC types — with no nested directory
    structure and (at this toy scale) no import-collision risk requiring symbol management.
    The concrete things Alloy buys `http-client-js` (multi-file package scaffolding, automatic
    import/reference resolution across an arbitrarily large declaration graph, TCGC type
    rendering) aren't exercised at this pilot's scale; the hand-rolled `collectModelRefs`
    import-collection helper in `src/render/type-ref.ts` is the one place Alloy's `refkey`
    system would most cleanly replace bespoke code.
  - **Recommendation for the real collaboration**: once this emitter covers the real multi-
    hundred-operation Storage surface (Blob/Queue/Table, likely split across multiple output
    files/directories per service), revisit Alloy/`@typespec/emitter-framework` for the render
    phase — that's the point where its symbol/import management and directory scaffolding stop
    being optional nice-to-haves and start saving real hand-rolled code, the same way
    `http-client-js` uses it. The transform/render phase split already in place here is
    render-technology-agnostic, so adopting Alloy later only touches `src/render/**`, not
    `src/build-model.ts`/`src/model.ts`.
- **Overlay mechanism: core augment decorators (`@@doc`), not TCGC's `@@override`.** `@@override`
  is designed for customizing generated **client** shapes; this pilot emitter doesn't consume TCGC
  at all (see below). Augment decorators demonstrate the same "separate overlay file layers
  changes onto an unchanged base file" structural pattern without pulling in TCGC machinery that
  this pilot doesn't otherwise need.
- **Enums and unions are intentionally simplified** to `string` and `unknown` respectively in the
  intermediate model, rather than full TS string-literal unions / discriminated unions.

## Explicitly out of scope (left for the real Azurite collaboration)

- **Full Azure Storage surface.** The real vendored fixture covers Queue only (17 operations);
  Blob and Table are not attempted, nor is anything close to the real spec's full size (hundreds
  of operations across all three services).
- **XML bodies.** The real Queue spec's request/response bodies are XML-based and compile/build
  cleanly through this pilot's transform phase, but the render phase still emits plain TS
  interfaces — it does not yet generate XML (de)serialization code, so the generated artifacts
  describe XML shapes without producing XML parsing/writing logic.
- **TCGC integration.** The real migration will likely need to consume
  `@azure-tools/typespec-client-generator-core` more deeply (e.g. for `@@override`-style client
  customization or language-specific naming beyond what this pilot's overlay uses). This pilot's
  devDependencies include TCGC only because the real vendored spec transitively imports it (for
  its `client.tsp`); the emitter itself still walks `@typespec/http` directly, not TCGC.
- **Streaming request/response bodies.**
- **Table-specific OData / batch-request behavior.**
- **Enums and unions as first-class generated types** (see Design notes above).
- **Multipart bodies and pagination.**
- **The one documented overlay gap**: relaxing `updateMessage`'s own inline `visibilityTimeout`
  parameter via augmentation (see "Real-spec compatibility" above) — needs either the correct
  TypeSpec reflection syntax for templated/`is`-defined operations, or a small first-class
  parameter-override decorator added to this emitter.
- **A real Azurite-side consumer** of the generated route-metadata table (e.g. an actual request
  dispatcher) — `operations.ts`'s `operations` const is illustrative routing metadata, not a
  wired-up router (though the companion `Azure/Azurite` end-to-end PR wires the toy fixture's
  generated output into a real hand-written dispatcher to validate the metadata shape).
