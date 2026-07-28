# Visibility-Based Model Splitting in `@azure-tools/typespec-ts`

## 1. Problem statement

Azure resources frequently declare server-side read-only properties (`@visibility(Lifecycle.Read)`), e.g. `provisioningState`, and ARM resource `name`/`id`. When such a property is **required**, the JS/TS SDK surfaces it as a mandatory field on the **write** (create/update) request type, forcing callers to supply a value they neither own nor can compute.

Root cause: the TS emitter renders a resource as a **single structural `interface`** shared by input and output. `@visibility(Lifecycle.Read)` maps to the TS `readonly` modifier, but `readonly` only blocks *reassignment* — the field stays **present and required** in the write type. TypeScript conflates "required" with "input"; there is no construction-time exclusion.

Every other Azure SDK language avoids this by separating a **settable input surface** from a **readable output surface** (§2). The goal is to make the TS emitter distinguish write-time from read-time shapes, matching the other emitters and the wire contract already produced for Swagger.

**Current workaround (to be superseded):** 11 specs manually define write-specific models in `client.tsp` and bind them via `@@alternateType(<op>::parameters.body, <WriteModel>, "javascript")`. This works but is per-spec, JS-only, and easy to get wrong.

## 2. Cross-language investigation

Same spec (`computeschedule`), where `ScheduledActionResource` has **required** read-only `name`/`id` (`@visibility(Lifecycle.Read)`) plus optional `type?`. How each generated SDK handles the write body:

| Lang | Write-body shape (generated) | Required read-only a caller burden? | Mechanism |
|------|------------------------------|-------------------------------------|-----------|
| **JS/TS** | `interface ScheduledActionResource { readonly name: string; readonly id: string; ... }` | ❌ **Yes** | One structural interface; `readonly` required field stays a mandatory input |
| **C#** | `ScheduledActionResourceDetails` — public ctor `(ResourceIdentifier resourceId)`; `Name`/`Id`/`Type` **get-only** | ✅ No | Get-only properties + ctor exposes only settable fields |
| **Java** | immutable client-side interface (getters only); writes go through a separate fluent builder | ✅ No | Immutable getter interface + fluent builder |
| **Go** | struct with `Name *string`, `ID *string`; read-only is a `READ-ONLY;` **doc comment** only | ✅ No | Every field is an optional pointer |
| **Python** | typed `__init__` overload **omits** every read-only field (incl. required `entity_name`) | ✅ No | `visibility` metadata + typed `__init__` overload |

**Takeaway:** four of five languages express read-only via *accessors/construction* or *all-optional pointers*, so a required read-only field never becomes a mandatory input. TypeScript is the sole outlier; C#/Python confirm required read-only props can be cleanly excluded, so parity is achievable.

Evidence: spec `specification/computeschedule/ComputeSchedule.Management/scheduledactionmodels.tsp:55-80`; JS `azure-sdk-for-js/.../arm-computeschedule/src/models/models.ts`; C# `.../ScheduledActionResourceDetails.cs`; Java `.../computeschedule/models/ScheduledActionResource.java`; Go `.../armcomputeschedule/models.go`; Python `.../azure-mgmt-cloudhealth/.../_models.py`.

## 3. Design Proposals

Both proposals split a model into read vs. write shapes. They differ in **when** a split happens and **how much** of the surface it touches.

### 3.1 Proposal 1 — Full lifecycle split (prior art, #4710)

Split **every** model by lifecycle visibility **by default**, regardless of whether it carries read-only properties, with a feature flag to disable:

| Position | Visibility | Emitted model |
|----------|-----------|---------------|
| response | Read | `Foo` |
| POST request | Create | `FooCreate` |
| PATCH request | Update | `FooUpdate` |
| PUT request | Create + Update | `FooCreateOrUpdate` |
| query/header request | Query | `FooQuery` |

- **Pros:** uniform, predictable names; matches the wire contract's canonical views by construction.
- **Cons:** up to 5 models per type even when views are identical → surface/`.d.ts` bloat; and widespread model-name **breaking changes** during TypeSpec migration (the main concern raised in the thread).

### 3.2 Proposal 2 — Visibility-filtered split

Split **only when the write view actually differs** — materialize `FooCreate` only if the projection drops or transforms a property; otherwise keep the single `Foo`. This bounds surface growth and minimizes migration name-breaks (unchanged models keep their name). It is the approach validated by the prototype.

It has two independent axes: **engine** (how to compute the projection, §3.2.1) and **location** (how deeply it integrates, §3.2.2).

#### 3.2.1 Engine — how to compute the projection

Two libraries can source the projection logic:

| | **`@typespec/http` helpers as oracle** (recommended) | **`@typespec/http-canonicalization` produces the types** |
|---|---|---|
| What it does | We borrow stable decision functions and materialize the split `SdkModelType` clones ourselves over TCGC's graph | The library fully materializes nested write models (`OuterCreate`→`InnerCreate`) for us |
| Output type system | Real `SdkModelType` clones — usage/access/serialization inherited for free | Raw compiler `Type` in the **mutator-framework realm** — must be converted back to `SdkModelType` |
| TCGC compatibility | Stays in TCGC's realm/caches | **Foreign realm** — TCGC's membership guards (`__mutatedRealm.hasType`) reject the nodes, so `@clientName`/`@access`/usage silently miss |
| API stability | Depends only on stable `@typespec/http` exports | Depends on an **experimental ("WILL CHANGE")** API |
| Verdict | ✅ recommended | ❌ realm conflict + instability, even if run *inside* TCGC (the conflict is structural: two mutation engines, two realms) |

**Note:** `@typespec/http-canonicalization` (`new HttpCanonicalizer(tk).canonicalize(op)`) implements the whole projection and names views `FooCreate`/`FooCreateOrUpdate` — but because it works on compiler `Type`s, feeding its output back into TCGC breaks realm-keyed caches. So we prefer `@typespec/http`'s stable helpers as an oracle and materialize the split ourselves over TCGC's `SdkModelType` graph (a recursive, collapse-aware clone `projectModel(meta, model, vis, cache)`), so the clones inherit usage/access/serialization and render with zero core-emitter changes. Three helpers drive it:

- `resolveRequestVisibility(program, operation, verb)` → the request `Visibility` (POST→Create, PUT→Create | Update, PATCH→Update, …); responses are always `Visibility.Read`.
- `MetadataInfo.isPayloadProperty(prop, visibility)` → the per-property keep/drop decision, matching the wire contract so write models align with Swagger.
- `getVisibilitySuffix(visibility, Visibility.Read)` → the name suffix (`Create`/`Update`/`CreateOrUpdate`/`Query`), returning `""` when the view equals Read — the signal to **collapse** instead of rename.

(See §5 for the projection's known gaps — cycles, discriminators, coincident views.)

#### 3.2.2 Location — how deeply the split integrates

The projection is trivial and inherits usage/access everywhere it runs; **what actually differs is integration** — whether the rest of the pipeline knows the split model exists, and who moves the reference edges. Three sub-proposals sit on an integration-depth axis:

- **(A) Emitter-local** (preferred) — the emitter clones, repoints `bodyParam.type`, and keeps a shadow set of extra models.
- **(B) TCGC pull-only helper** — a helper (e.g. `getRequestBodyModelForVisibility`) lives in TCGC and **returns** the split model, but the emitter still repoints bodies and registers the produced models.
- **(C) TCGC context-construction** — a `createSdkContext(..., { splitModelsByVisibility: true })` flag returns a context whose `sdkPackage`/operations are **already** split; the emitter consumes it verbatim.

**Same in all three:** the projection algorithm; and source-model decorators (`@clientName`, `@access`, …) are baked into the source `SdkModelType`, so clones inherit them. Decorators *targeting the split model itself* are **impossible everywhere** — `FooCreate` has no TypeSpec symbol.

**What actually differs:**

| | **(A) Emitter-local** | **(B) TCGC pull-only** | **(C) TCGC context-construction** |
|---|---|---|---|
| Split model in `getAllModels()` / `sdkPackage.models` | ❌ shadow set only | ❌ returned only | ✅ first-class member |
| Name-collision vs. a user's real `FooCreate` | binder renames positionally (`FooCreate_1`); semantic dedup is extra | same as A | ✅ reuses TCGC's dedup (if split runs before/with naming) |
| `body.type === response.type` invariant | preserved on canonical graph; only JS copy diverges → **localized** | same as A | **diverges globally** in the context → larger blast radius |
| Emitter work required | all of it | repoint + register | **none** |
| Who keeps the clone valid as `SdkModelType` evolves | shallow spread inherits new fields automatically (low burden) | TCGC | TCGC |
| Who is affected | JS only | JS only | **JS only too** — `createSdkContext` is per-emitter |
| Shipping velocity / size | fastest | small TCGC change | largest (touches construction + identity invariant) |

**(A) is preferred:** it is JS-only, ships without a TCGC release, and keeps the change fully in the emitter we own — so we can maintain and iterate on it directly. The clone is a shallow spread of an `SdkModelType`, so it inherits new fields automatically like every other emitter site; the only real cost is that name collisions fall back to the binder's positional rename (§5) rather than a semantic name.

## 4. Implementation

The whole feature is a single emitter pre-pass in `src/modular/helpers/visibility-helpers.ts`:

- `applyVisibilityModelSplit(context: SdkContext): void`

It runs in `provideSdkTypes` **immediately before** `visitPackageTypes(context)` — the graph walk that builds the `emitQueue` — so the repointed graph is what gets emitted. Walking every operation, it does two things.

**Part 1 — Create the split model.** A recursive, collapse-aware clone builds the write view:

- `projectModelToVisibility(state, model, visibility): { result, changed }` — clones via shallow spread (`{ ...model, name, properties }`), drops non-payload properties (`MetadataInfo.isPayloadProperty`), recurses into nested models, and renames with `getVisibilitySuffix` only when something changed (otherwise returns the original — collapse). It memoizes (seeding before recursion so cycles terminate) and collects each produced clone.

**Part 2 — Link the model to the operation.**

- `repointMethodBody(state, method): void` — resolves the write visibility from the verb (`resolveRequestVisibility`), projects the body, and if it changed points `operation.bodyParam.type` **and** the matching `method.parameters[i].type` at the projected model, leaving `responses[].type` on the original read model. Spread bodies are skipped.

Finally, the produced clones are pushed into `context.sdkPackage.models` so they are emitted and visible to consumers that read that list directly.

**Feature flag.** Everything above is gated by `experimentalSplitModelsByVisibility` (emit option `experimental-split-models-by-visibility`), **default OFF**. When a model already carries an `@@alternateType` JS workaround, defer to it — do not double-split.

## 5. Open questions

- **Collision-aware naming:** when a synthesized `FooCreate` clashes with a user-declared model of the same name, the binder renames the synthesized one positionally to `FooCreate_1` (verified in `visibility-scenarios/03-name-collision`). Decide: is `FooCreate_1` acceptable, or do we add a semantic rename (e.g. a deterministic `FooCreate2`)?
- **Discriminated unions / polymorphism:** view splitting must propagate through discriminator hierarchies (`buildModelPolymorphicType`) — currently unhandled (see scenario 04).
- **Cyclic models:** the memo seeds the original before recursing, so a cyclic back-edge resolves to the read view (see scenario 07); needs a fix-up pass for full fidelity.

## 6. Scenarios

Runnable projects under `packages/typespec-ts/visibility-scenarios/` (spec + `tspconfig.yaml` + generated code) exercise the feature with the flag on.

- **`01-widget-create`** — a `Widget` with required read-only `id`/`name` used as a `POST` body splits into `WidgetCreate` (write) vs. `Widget` (read). A sibling `Gadget` with no read-only props **collapses** to itself (no `GadgetCreate`, no rename), showing the "must collapse" case where request and response share one model.
- **`02-nested-createorupdate`** — `A` nests `B`, both with a required read-only prop; a `PUT` body resolves to `ACreateOrUpdate` + recursively `BCreateOrUpdate`. A second pair shows propagation: `C` has only writable props but nests `D` (read-only prop), yet `CCreate` is **still** synthesized because the nested change propagates up (`C.child` → `DCreate`).
- **`03-name-collision`** — the spec already declares a user model `WidgetCreate` while `Widget`'s `POST` body also projects to `WidgetCreate`. Output is valid TypeScript, but the synthesized model is renamed positionally by the binder to `WidgetCreate_1` — non-semantic and order-dependent (see the collision-naming open question).
