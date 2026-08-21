# Visibility model-split scenarios

Standalone TypeSpec projects that exercise the experimental
`experimental-split-models-by-visibility` emitter option, laid out like the
`typespec-test` reference projects (`spec/` + `tspconfig.yaml` + `generated/`)
so you can eyeball the real generated code.

Each scenario enables the flag in its `tspconfig.yaml`:

```yaml
options:
  "@azure-tools/typespec-ts":
    experimental-split-models-by-visibility: true
```

The feature is implemented **entirely in the JS emitter**
(`src/modular/helpers/visibility-helpers.ts`), with no TCGC dependency
beyond the public `SdkModelType` shape and the stable `@typespec/http`
visibility helpers (`resolveRequestVisibility`, `createMetadataInfo`,
`getVisibilitySuffix`). A pre-pass runs before the emit-queue graph walk: for
each HTTP operation with a model request body it clone-projects the body model
to the operation's write visibility (dropping non-payload properties, recursing
into nested models, never mutating the original graph), repoints the operation
body + method parameters to the projected model, and registers every produced
split model for emission. Projected models are named `${sourceName}${suffix}`
(`FooCreate`, `FooCreateOrUpdate`); collisions with a same-named user model are
**not** resolved in this PoC (see `03-name-collision` and the design doc's open
question).

## Scenarios

### `01-widget-create`
A single `Widget` with required read-only `id`/`name` used as a `POST` body,
plus a `Gadget` with **no** read-only props used the same way.

- **`Widget`** (response / read view) — keeps `readonly id`, `readonly name`, `displayName`, `weight`.
- **`WidgetCreate`** (request / write view) — only `displayName`, `weight`; the required read-only props no longer leak into the input type.
- `createWidget(body: WidgetCreate): Promise<Widget>` — input and output shapes are now distinct.
- **`Gadget`** (shared) — with no read-only props the write view collapses to the same model, so **no `GadgetCreate` is synthesized**: `createGadget(body: Gadget): Promise<Gadget>` reuses one model for request and response (the "must collapse, no rename" case).

See `generated/typespec-ts/src/models/models.ts` and `src/api/operations.ts`.

### `02-nested-createorupdate`
`A` contains a nested `B`; both have a required read-only property. `A` is used
as a `PUT` body, so the write view resolves to `Create | Update` →
`CreateOrUpdate`, applied recursively. A second pair `C`/`D` tests propagation:
`C` has **only writable** properties but nests `D` (which has a read-only prop),
used as a `POST` body.

- **`A`** / **`B`** (read) — keep `readonly aid` / `readonly bid`.
- **`ACreateOrUpdate`** — drops `aid`; its `child` is repointed to `BCreateOrUpdate`.
- **`BCreateOrUpdate`** — drops `bid`, keeps `label`.
- **`CCreate` is still synthesized** even though `C`'s own props are all writable: because its nested `D` must change (dropping `readonly did` → `DCreate`), the change propagates up and `C.child` is repointed to `DCreate`. `createC(body: CCreate): Promise<C>`.

See `generated/typespec-ts/src/models/models.ts`.

### `03-name-collision`
The spec **already declares** a user model named `WidgetCreate` (with no
read-only props, so its own write view collapses to itself), while `Widget`'s
`POST` body **also** projects to a synthesized `WidgetCreate`. Two distinct
models now compete for the same name.

Observed result with the PoC (no collision handling in the split step):

- The **user's** `WidgetCreate` (`foo`, `bar`) keeps the clean name; `createOther` uses it.
- The **synthesized** write model is renamed by the emitter's binder to **`WidgetCreate_1`** (`displayName` only), with `widgetCreateSerializer_1`; `createWidget(body: WidgetCreate_1): Promise<Widget>`.

Key takeaway: the collision does **not** produce invalid TypeScript — the JS
emitter's binder-level dedup guarantees unique identifiers. But the resulting
name (`WidgetCreate_1`) is **non-semantic and order-dependent**: it comes from a
positional suffix applied late by the binder, not from a semantic naming pass.
The PoC deliberately leaves this unresolved; how (and where) to make the split
naming collision-aware is captured as an **open question** in the design doc.

See `generated/typespec-ts/src/models/models.ts` and `src/api/operations.ts`.

## Harder scenarios (previously gaps, now supported)

These three scenarios exercise the harder cases — discriminated hierarchies,
spread request bodies, and cyclic models — that a naive pull-only projection
would get wrong. They were originally gap scenarios; the emitter now handles all
three, and each generated output below shows the correct result.

### `04-discriminated-polymorphic` — **fixed via hierarchy projection**

A `@discriminator("kind")` base `Pet` (read-only `petId`) with `Cat`/`Dog`
subtypes. `Cat` also has its own read-only `livesLeft`. The spec exercises two
entry points: `createCat` (body is the `Cat` **subtype**, declared first) and
`createPet` (body is the `Pet` **base**).

The pre-pass projects the **whole discriminator hierarchy** together: it walks
to the discriminated root, clones every node (base + subtypes) with the
`Create` suffix, and re-wires each clone's `baseModel` and `discriminatedSubtypes`
onto the projected nodes.

- `PetCreate` drops `petId`; `CatCreate extends PetCreate` drops `livesLeft`;
  `DogCreate extends PetCreate` is still cloned (it must re-parent even though it
  adds no read-only props of its own).
- `PetCreateUnion = CatCreate | DogCreate | PetCreate` is emitted — **no
  `__PLACEHOLDER` leaks**.
- Because any model in the hierarchy routes through the root, `createCat` (the
  direct subtype reference declared *first*) reuses the **same** `CatCreate`
  clone as the one reached via `Pet` — exactly one `CatCreate`, no duplicate.

See `generated/typespec-ts/src/models/models.ts` and `src/api/operations.ts`.

### `05-spread-body` — **benign for flat props, fixed for nested models**
Two spread bodies show two outcomes.

`op createWidget(...Widget)` spreads a model whose only read-only prop (`id`) is
top-level:

- No `WidgetCreate` is produced, and the generated `createWidget(displayName,
  weight)` **already omits** the read-only `id` — TCGC applies request
  visibility per spread parameter, stripping non-payload props on its own. The
  split is simply unnecessary here (benign no-op).

`op createContainer(...Container)` spreads a model with a **model-typed** `detail`
property, and `Detail` has its own read-only `detailId`:

- The top-level read-only `containerId` is dropped by TCGC's spread handling.
  The nested read-only used to **leak** through the whole-model `detail: Detail`
  parameter, because a spread body has no single whole-`Container` param for the
  old identity check to repoint.
- **Fixed** by driving off `bodyParam.methodParameterSegments`: each segment's
  root (`segment[0]`) is a client-method parameter, so the pre-pass projects the
  model-typed `detail` parameter and repoints **both** the method parameter and
  the matching wrapper property. The generated `createContainer(title, detail)`
  now takes `detail: DetailCreate` (no `detailId`) and serializes it with
  `detailCreateSerializer`, so the produced `DetailCreate` is **referenced, not
  orphaned**. `title: string` is untouched, and the read path keeps full
  `Detail` for the response deserializer.

See `generated/typespec-ts/src/api/operations.ts` and `.../models/models.ts`.

### `06-cyclic-model` — **cycle repointed to write view**
`Node` (read-only `nodeId`) has an optional `next?: Node` self-reference, used as
a `POST` body. The collect phase seeds each node **before** recursing, so the
self-referential back-edge terminates instead of looping.

- Because Phase 3 materializes every clone shell **before** wiring any edges, the
  cyclic edge resolves to the write clone with no special-casing: `NodeCreate`
  drops `nodeId` **and** its `next?` now points at **`NodeCreate`**, with
  `nodeCreateSerializer` delegating `next` to `nodeCreateSerializer`. So a nested
  create at any depth correctly sheds the read-only `nodeId`. The read view keeps
  full `Node` for the response deserializer. The same materialize-then-wire order
  fixes mutual recursion (A→B→A) alike — no separate back-patch pass is needed.

See `generated/typespec-ts/src/models/models.ts`.

The emitter must be built first (`npm run build` in `packages/typespec-ts`).
Then, from a scenario directory:

```pwsh
npx tsp compile spec/main.tsp
```

Output is written to `generated/typespec-ts/` (per `emitter-output-dir`).

## Comparing with the flag OFF

To see the leak the feature removes, set
`experimental-split-models-by-visibility: false` (or delete the line) and
regenerate: `Widget` keeps `readonly id`/`name` and `createWidget` takes
`body: Widget`, forcing callers to supply server-assigned read-only fields.
