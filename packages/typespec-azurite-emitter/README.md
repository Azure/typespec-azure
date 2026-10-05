# @azure-tools/typespec-azurite-emitter

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

## Real-spec validation

This pilot's unit/e2e tests above use a small, self-contained toy fixture by design (see
[Explicitly out of scope](#explicitly-out-of-scope-left-for-the-real-azurite-collaboration)).
**Validation against the real, unchanged Azure Storage Queue TypeSpec — plus a real `azurite.tsp`
overlay citing [`Azure/Azurite`'s documented `swagger/queue.md`](https://github.com/Azure/Azurite/blob/main/swagger/queue.md)
customizations — lives in the companion end-to-end `Azure/Azurite` pull request**, not in this
repo: this repo's fixtures intentionally stay toy-sized and don't vendor the real Storage spec.

That real-spec work did surface, and this pilot's transform phase (`src/build-model.ts`) now
fixes, three generic gaps a toy fixture wouldn't exercise:

1. **`Record<T>` dictionary properties** (e.g. a `metadata: Record<string>` property) were
   previously routed through the generic named-model registration path and rendered as an empty
   `interface Record {}` instead of `Record<string, string>`. Fixed by checking
   `isRecordModelType` in `toTypeRef` before the generic-model fallback, and adding a
   `{ kind: "record"; element: ServerTypeRef }` `ServerTypeRef` variant.
2. **Anonymous-model identity collisions.** Keying the anonymous-model cache by `model.name`
   (empty string for every anonymous model) silently coalesced genuinely different anonymous
   shapes (e.g. two differently-shaped inline response bodies) into one shared registry entry.
   Fixed by keying the cache by TypeSpec object identity (`Map<Model, string>`) instead, so each
   distinct anonymous model gets its own `AnonymousModelN` name.
3. **Operation-name collisions across TypeSpec interfaces.** Two different interfaces each
   declaring an operation that PascalCases to the same name (e.g. two `getProperties` operations)
   previously produced a genuine `TS2300: Duplicate identifier` in the generated
   `operations.ts`/`handlers.ts`. Fixed by qualifying a colliding operation's name with its
   containing TypeSpec interface name, falling back to a numeric suffix if still not unique.

All three are covered by synthetic unit tests in `test/build-model.test.ts` using small inline
fixtures (not the real spec), so this repo's test suite stays self-contained while still
exercising the fixes the real spec required.

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

## Tests

- `test/build-model.test.ts` — unit tests for the transform phase: given the compiled fixture
  program, asserts the intermediate server model has the right operations, parameter bindings,
  request/response bodies, headers, and referenced models (including overlay-applied docs), plus
  synthetic tests for `Record<T>` handling, anonymous-model identity, and cross-interface
  operation-name collisions (see "Real-spec validation" above for why those exist).
- `test/render.test.ts` — assertion-based tests for the render phase against a hand-built
  `ServerModel`, independent of the TypeSpec compiler.
- `test/e2e.test.ts` — a true end-to-end test: compiles the fixture (base + azurite overlay) with
  the emitter via `@typespec/compiler/testing`'s `createTester`, and asserts all three generated
  files exist and contain the expected generated code.
- `test/azurite-compat.test.ts` — structural fit-check against the real `Azure/Azurite` repo (see
  above), citing the specific files/behaviors compared against.

Run with `pnpm test` from this package's directory (or `pnpm --filter
@azure-tools/typespec-azurite-emitter test` from the repo root).

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
- **`@makeRequired`: a small custom decorator for service-contract-level overlay changes.**
  `@@override` was considered (and rejected) for the specific case of an `azurite.tsp` overlay
  tightening an **optional base-spec property to required** for the emulator. TCGC's `@override`
  (`packages/typespec-client-generator-core/src/decorators.ts`) only records state consumed by
  `createSdkContext`'s client-method resolution — it never mutates the real `@typespec/http`
  `Operation`/`Model` graph, so an emitter that walks `@typespec/http` directly (like this one)
  would never see its effect. Instead, this package ships its own tiny decorator,
  `@makeRequired(target: ModelProperty)` (declared in [`lib/decorators.tsp`](./lib/decorators.tsp),
  implemented in [`src/decorators.ts`](./src/decorators.ts)), which directly sets
  `target.optional = false` — the same pattern `@typespec/compiler`'s own stdlib
  `$withOptionalProperties` uses in reverse. It's generated/wired up the same way TCGC generates
  its own decorator signatures: `pnpm gen-extern-signature` (via `@typespec/tspd`'s
  `gen-extern-signature` command) reads the `extern dec` declaration in `lib/decorators.tsp` and
  produces the typed `MakeRequiredDecorator` signature plus a `$decorators["Azurite"]` shape check
  into `generated-defs/Azurite.ts`/`Azurite.ts-test.ts`, so the hand-written implementation in
  `src/decorators.ts` can't drift from the declared signature. Usage from an overlay:
  ```tsp
  import "@azure-tools/typespec-azurite-emitter";
  using Azurite;

  @@makeRequired(SomeModel.someOptionalProperty);
  ```
  See `test/build-model.test.ts`'s `"applies @makeRequired from an azurite.tsp-style overlay..."`
  test for a full worked example.
- **Enums and unions are intentionally simplified** to `string` and `unknown` respectively in the
  intermediate model, rather than full TS string-literal unions / discriminated unions.

## Explicitly out of scope (left for the real Azurite collaboration)

- **Full Azure Storage surface.** This pilot models a toy "Queue-like" service with 3 operations —
  it does not attempt Blob, Queue, or Table surfaces, or anything close to their real size/shape.
  Validation against the real Storage spec (hundreds of operations across Blob/Queue/Table) is
  done in the companion `Azure/Azurite` end-to-end pull request, not in this repo (see "Real-spec
  validation" above).
- **XML bodies.** Storage's Blob/Queue APIs are heavily XML-based; this pilot only exercises JSON.
- **TCGC integration.** The real migration will likely need to consume
  `@azure-tools/typespec-client-generator-core` (e.g. for `@@override`-style client
  customization, language-specific naming, or pulling in the real `@@clientName`/`@@access`
  overlays). This pilot walks `@typespec/http` directly and does not use TCGC.
- **Streaming request/response bodies.**
- **Table-specific OData / batch-request behavior.**
- **Enums and unions as first-class generated types** (see Design notes above).
- **Multipart bodies, `@typespec/xml`, versioning, and pagination.**
- **A real Azurite-side consumer** of the generated route-metadata table (e.g. an actual request
  dispatcher) — `operations.ts`'s `operations` const is illustrative routing metadata, not a
  wired-up router (though the companion `Azure/Azurite` end-to-end PR wires generated output into
  a real hand-written dispatcher to validate the metadata shape).
