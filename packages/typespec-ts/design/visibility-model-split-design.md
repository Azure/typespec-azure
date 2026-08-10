# Visibility-Based Model Splitting in `@azure-tools/typespec-ts`

## 1. Problem statement

Azure resources frequently declare server-side read-only properties (`@visibility(Lifecycle.Read)`), e.g. `provisioningState`, and ARM resource `name`/`id`. When such a property is **required**, the JS/TS SDK surfaces it as a mandatory field on the **write** (create/update) request type, forcing callers to supply a value they neither own nor can compute.

Root cause: the TS emitter renders a resource as a **single structural `interface`** shared by input and output. `@visibility(Lifecycle.Read)` maps to the TS `readonly` modifier, but `readonly` only blocks *reassignment* — the field stays **present and required** in the write type. TypeScript conflates "required" with "input"; there is no construction-time exclusion.

Every other Azure SDK language avoids this by separating a **settable input surface** from a **readable output surface** (§2). The goal is to make the TS emitter distinguish write-time from read-time shapes, matching the other emitters and the wire contract already produced for Swagger.

**Current workaround (to be superseded):** 11 specs manually define write-specific models in `client.tsp` and bind operation parameters via `@@alternateType(..., <WriteModel>, "javascript")`. This works but is per-spec, JS-only, and easy to get wrong.

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

Two core TypeSpec libraries can source the projection logic:

- **[`@typespec/http`](https://github.com/microsoft/typespec/tree/main/packages/http)** — the standard HTTP library that resolves how operations map to the wire. It exposes stable, low-level helpers for the *decisions* we need: which visibility a request has ([`resolveRequestVisibility`](https://github.com/microsoft/typespec/blob/main/packages/http/src/metadata.ts)) and whether a property is on the payload for that visibility ([`MetadataInfo.isPayloadProperty`](https://github.com/microsoft/typespec/blob/main/packages/http/src/metadata.ts)). It tells us *what to keep/drop*, but does **not** materialize any split model — we build the clones ourselves.
- **[`@typespec/http-canonicalization`](https://github.com/microsoft/typespec/tree/main/packages/http-canonicalization)** — an experimental library (built on the mutator/emitter frameworks) that goes one step further and *fully materializes* the per-visibility model views for an operation ([`HttpCanonicalizer.canonicalize`](https://github.com/microsoft/typespec/blob/main/packages/http-canonicalization/src/operation.ts)), naming them `FooCreate`/`FooCreateOrUpdate`/… itself. It produces the split types for us, but as raw compiler `Type`s in its own mutation realm.

The choice below is whether to borrow `@typespec/http`'s decision helpers as an **oracle** and materialize the split over TCGC's graph ourselves, or to let `@typespec/http-canonicalization` **produce the types** and convert them back.

| | **`@typespec/http` helpers as oracle** (recommended) | **`@typespec/http-canonicalization` produces the types** |
|---|---|---|
| What it does | We borrow stable decision functions and materialize the split `SdkModelType` clones ourselves over TCGC's graph | The library fully materializes nested write models (`OuterCreate`→`InnerCreate`) for us |
| Output type system | Real `SdkModelType` clones — usage/access/serialization inherited for free | Raw compiler `Type` in the **mutator-framework realm** — must be converted back to `SdkModelType` |
| TCGC compatibility | Stays in TCGC's realm/caches | **Foreign realm** — TCGC's membership guards (`__mutatedRealm.hasType`) reject the nodes, so `@clientName`/`@access`/usage silently miss |
| API stability | Depends only on stable `@typespec/http` exports | Depends on an **experimental ("WILL CHANGE")** API |
| Verdict | ✅ recommended | ❌ realm conflict + instability, even if run *inside* TCGC (the conflict is structural: two mutation engines, two realms) |

**Note:** `@typespec/http-canonicalization` (`new HttpCanonicalizer(tk).canonicalize(op)`) implements the whole projection and names views `FooCreate`/`FooCreateOrUpdate` — but because it works on compiler `Type`s, feeding its output back into TCGC breaks realm-keyed caches. So we prefer `@typespec/http`'s stable helpers as an oracle and materialize the split ourselves over TCGC's `SdkModelType` graph, so the clones inherit usage/access/serialization and render with zero core-emitter changes. Three helpers drive it:

- `resolveRequestVisibility(program, operation, verb)` → the request `Visibility` (POST→Create, PUT→Create | Update, PATCH→Update, …); responses are always `Visibility.Read`.
- `MetadataInfo.isPayloadProperty(prop, visibility)` → the per-property keep/drop decision, matching the wire contract so write models align with Swagger.
- `getVisibilitySuffix(visibility, Visibility.Read)` → the name suffix (`Create`/`Update`/`CreateOrUpdate`/`Query`) for a model that requires a clone. Collapse is determined separately by whether the reachable write graph drops any properties.

#### 3.2.2 Location — how deeply the split integrates

The projection is trivial and inherits usage/access everywhere it runs; **what actually differs is integration** — whether the rest of the pipeline knows the split model exists, and who moves the reference edges. Three sub-proposals sit on an integration-depth axis:

- **(A) Emitter-local** (preferred) — the emitter clones, repoints operation bodies, and registers the extra models in `sdkPackage.models`.
- **(B) TCGC pull-only helper** — a helper (e.g. `getRequestBodyModelForVisibility`) lives in TCGC and **returns** the split model, but the emitter still repoints bodies and registers the produced models.
- **(C) TCGC context-construction** — a `createSdkContext(..., { splitModelsByVisibility: true })` flag returns a context whose `sdkPackage`/operations are **already** split; the emitter consumes it verbatim.

**Same in all three:** the projection algorithm; and source-model decorators (`@clientName`, `@access`, …) are baked into the source `SdkModelType`, so clones inherit them. Decorators *targeting the split model itself* are **impossible everywhere** — `FooCreate` has no TypeSpec symbol.

**What actually differs:**

| | **(A) Emitter-local** | **(B) TCGC pull-only** | **(C) TCGC context-construction** |
|---|---|---|---|
| Known during TCGC context construction | ❌ registered later by emitter | ❌ returned later to emitter | ✅ constructed as a first-class member |
| Name-collision vs. a user's real `FooCreate` | binder renames positionally (`FooCreate_1`); semantic dedup is extra | same as A | ✅ reuses TCGC's dedup (if split runs before/with naming) |
| `body.type === response.type` invariant | preserved on canonical graph; only JS copy diverges → **localized** | same as A | **diverges globally** in the context → larger blast radius |
| Emitter work required | all of it | repoint + register | **none** |
| Who keeps the clone valid as `SdkModelType` evolves | shallow spread inherits new fields automatically (low burden) | TCGC | TCGC |
| Who is affected | JS only | JS only | **JS only too** — `createSdkContext` is per-emitter |
| Shipping velocity / size | fastest | small TCGC change | largest (touches construction + identity invariant) |

**(A) is preferred:** it is JS-only, ships without a TCGC release, and keeps the change fully in the emitter we own — so we can maintain and iterate on it directly. The clone is a shallow spread of an `SdkModelType`, so it inherits new fields automatically like every other emitter site; the only real cost is that name collisions fall back to the binder's positional rename rather than a semantic name.

## 4. Implementation

The whole feature is a single emitter pre-pass in `src/modular/helpers/visibility-helpers.ts`:

- `applyVisibilityModelSplit(context: SdkContext): void`

It runs in `provideSdkTypes` **immediately before** `visitPackageTypes(context)` — the graph walk that builds the `emitQueue` — so the repointed graph is what gets emitted. It is a single graph rewrite in four phases, gated by the feature flag (see below).

The phases operate on a graph of `(model, visibility)` nodes. Each node carries the two flags the phases below revolve around:

```ts
interface ModelNode {
  model: SdkModelType;
  visibility: Visibility;
  refKeys: Set<string>;      // keys of nodes this node references (props + discriminated base/subtypes)
  ownPropertyDropped: boolean; // does THIS model omit ≥1 of its own props under `visibility`? (a local fact)
  needsClone: boolean;         // can this node REACH any dropped property? ⇒ needs a write clone (derived)
}

interface SplitState {
  context: SdkContext;
  metadata: MetadataInfo;              // @typespec/http oracle; decides isPayloadProperty
  nodes: Map<string, ModelNode>;       // keyed by emitter-local model identity + visibility
  cloneByKey: Map<string, SdkModelType>; // the write clone built for each node that needsClone
  modelIds: WeakMap<SdkModelType, number>; // preserves identity across generic instantiations
  nextModelId: number;
}
```

We follow one worked example through all four phases: a `POST createWidget(body: Widget)` (write visibility = `Create`, suffix `Create`) over these source models:

```
Widget                      Detail                    Meta
├─ name                     ├─ label                  └─ tag
├─ id      @Read  ✗DROP     ├─ secret   @Read ✗DROP
├─ detail ──► Detail        └─ next ──► Detail (cycle)
└─ meta   ──► Meta
```

**Phase 1 — Collect** (`collectMethodRoots` → `collectNode`). Resolve the write visibility from the verb (`resolveRequestVisibility`), then DFS from each model-typed body root building one node per `(model, visibility)`. Each node records references through direct model properties and array element types, plus `ownPropertyDropped` (does it omit an own property under this visibility — `MetadataInfo.isPayloadProperty`). Nodes are seeded *before* recursing, so the `Detail → Detail` back-edge terminates; the source graph is never mutated.

```
        detail          next
 ┌────────┐      ┌────────┐──┐
 │ Widget │ ───► │ Detail │  │  (self-cycle: next ──► Detail)
 │dropped │      │dropped │◄─┘
 └───┬────┘      └────────┘
     │ meta
     ▼
 ┌────────┐
 │  Meta  │   (no drop)
 └────────┘
```

**Phase 2 — Mark** (`markNodesNeedingClones`). Reverse-propagate `needsClone` outward from every `ownPropertyDropped` node: a node needs a clone iff it can *reach* a drop. As a transitive closure it needs no special-casing for cycles, mutual recursion, or discriminated trees.

```
 Widget  ✔ needsClone   (own drop: id)
 Detail  ✔ needsClone   (own drop: secret; Widget reaches it too)
 Meta    ·  collapses   (reaches no drop → no clone, reused as-is)
```

**Phase 3 — Build clones** (`buildClones`). Pass 1 allocates an empty shell (`getVisibilitySuffix` name) for every node that needs a clone; pass 2 wires them once *all* shells exist — dropping non-payload props, repointing direct model references and array element models (and, for discriminated nodes, `baseModel`/`discriminatedSubtypes`) at their clones. Array types are shallow-cloned only when their element type changes. Shells-before-wiring is what lets the `Detail` self-cycle repoint to the clone rather than the read model.

```
 WidgetCreate {                 DetailCreate {              Meta  (reused, no clone)
   name                           label
   detail ──► DetailCreate        next ──► DetailCreate     // self-cycle → clone
   meta   ──► Meta              }
 }
 // dropped (both @Read): Widget.id, Detail.secret
```

**Phase 4 — Link** (`repointMethodBody`). Point each model-typed method parameter — and the payload side (`bodyParam.type` for a non-spread body, or the matching wrapper property for a *spread* body) — at its clone. Responses are left alone, so the read graph survives.

```
 POST createWidget(body: WidgetCreate)     // request  → write view
 response.type ──► Widget                  // response → read view (unchanged)
```

Finally, the clones (`state.cloneByKey.values()`) are pushed into `context.sdkPackage.models` so `visitPackageTypes` emits them.

**Discriminated hierarchies** are the one case the linear example above can't show. `collectNode` links a discriminated base and its subtypes with *bidirectional* edges, so a drop *anywhere* marks the **whole tree** as needing clones in Phase 2, and Phase 3 clones every node — each subtype re-parenting onto the projected base. A `POST createPet(body: Pet)` where only `Pet.petId` and `Cat.livesLeft` are `@Read`:

```
 source tree                     write clones (any drop ⇒ whole tree clones)
 (base↔subtype edges             ────────────────────────────────────────────
  are bidirectional)             PetCreate                 // sheds petId
                                 ├─ CatCreate ──► PetCreate // sheds petId + livesLeft
 Pet  ✗DROP (petId)              └─ DogCreate ──► PetCreate // no own drop, but must
 ├─ Cat  ✗DROP (livesLeft)                                  //   re-parent to shed petId
 └─ Dog  (no own drop)           + PetCreateUnion           // alias over Cat/DogCreate
```

**Feature flag.** Everything above is gated by `experimentalSplitModelsByVisibility` (emit option `experimental-split-models-by-visibility`). The pass projects the operation parameter model present in the TCGC graph; it does not separately detect whether that model came from an `@@alternateType` customization. Existing visibility workarounds should therefore be removed when validating their generated replacement.

## 5. Scenarios

Runnable projects under `packages/typespec-ts/visibility-scenarios/` (spec + `tspconfig.yaml` + generated code) exercise the feature with the flag on.

- **`01-widget-create`** — a `Widget` with required read-only `id`/`name` used as a `POST` body splits into `WidgetCreate` (write) vs. `Widget` (read). A sibling `Gadget` with no read-only props **collapses** to itself (no `GadgetCreate`, no rename), showing the "must collapse" case where request and response share one model.
- **`02-nested-createorupdate`** — `A` nests `B`, both with a required read-only prop; a `PUT` body resolves to `ACreateOrUpdate` + recursively `BCreateOrUpdate`. A second pair shows propagation: `C` has only writable props but nests `D` (read-only prop), yet `CCreate` is **still** synthesized because the nested change propagates up (`C.child` → `DCreate`).
- **`03-name-collision`** — the spec already declares a user model `WidgetCreate` while `Widget`'s `POST` body also projects to `WidgetCreate`. Output is valid TypeScript, but the synthesized model is renamed positionally by the binder to `WidgetCreate_1` — non-semantic and order-dependent.
- **`04-discriminated-polymorphic`** — a `@discriminator("kind")` base `Pet` (read-only `petId`) with `Cat` (own read-only `livesLeft`) and `Dog` subtypes. The whole hierarchy is projected together: `PetCreate` drops `petId`, `CatCreate extends PetCreate` drops `livesLeft`, and `DogCreate` is still cloned so it can re-parent to `PetCreate` even though it adds no read-only prop of its own, and `PetCreateUnion = CatCreate | DogCreate | PetCreate` is emitted (no unresolved polymorphic placeholder). Because any model routes through the discriminated root, a `createCat` operation whose body is the `Cat` **subtype** — declared *before* the `createPet` base operation — reuses the same single `CatCreate` clone rather than producing a duplicate.
- **`05-spread-body`** — an operation that **spreads** a model into its request body (the body is a synthesized wrapper serialized property-by-property, not a single body model). A spread parameter of type `Detail` (with a read-only prop) is repointed to `DetailCreate`, exercising the spread branch of `repointMethodBody` (repoint the matching wrapper property, not `bodyParam.type`). Also covers deep propagation: a spread member with no read-only prop of its own is still cloned when it nests a model that drops one.
- **`06-cyclic-model`** — a self-referential `Node` (`next?: Node`) with a required read-only `nodeId`. The `POST` body splits into `NodeCreate` while the read view stays `Node`, and crucially the cyclic back-edge is repointed to the write clone: `NodeCreate.next?: NodeCreate` (not `Node`). Verifies the materialize-then-wire design resolves self-cycles without a separate back-patch pass.

The modular unit suite additionally covers two defects found during real SDK regeneration:

- Distinct generic model instantiations remain separate even when they share a cross-language definition ID.
- Models used as array elements are projected and the containing array is rewired to the projected element type.

## 6. Performance

Measured on two large ARM specs by compiling real `azure-rest-api-specs` with a locally-linked build of this emitter, toggling `experimental-split-models-by-visibility` (the pre-pass early-returns when off, giving a free baseline). "Split pre-pass" is the time inside `applyVisibilityModelSplit`; "total emit" is warm-cache `tsp compile` wall time.

| Spec | Models | Clones (on) | Split pre-pass | Total emit off → on |
| --- | --- | --- | --- | --- |
| `Microsoft.Network/Network` | 1060 | +253 | 15–19 ms | ~87 s → ~90 s |
| `Microsoft.Compute/Compute` | 548 | +142 | 11 ms | ~41 s → ~43 s |

- **The pre-pass is effectively free** — 11–19 ms even at 1000+ models (<0.05% of emit), linear in the write-body graph.
- **The ~2–6% total overhead is downstream**, from emitting the extra clone models, and scales with clone count — not the algorithm.
- **No regressions at scale** — both specs compiled cleanly with the flag on, covering discriminated, spread, and cyclic models.

## 7. Impact on the existing SDKs

Enabling `experimental-split-models-by-visibility` changes the public TypeScript API of an existing SDK even though it does **not** change the service's HTTP contract. The request types become a more accurate representation of the existing wire payload. Consumer TypeScript applications that import, annotate, or construct the previous request models may require source changes after upgrading.

The impact was evaluated by regenerating nine TypeSpec-based ARM packages that currently use JavaScript-specific visibility workarounds: Relationships, Cloud Health, Compute Schedule, Device Registry, Disconnected Operations, Discovery, Monitor Workspaces, Resilience Management, and Security. The generated diff is available in [Azure/azure-sdk-for-js#39505](https://github.com/Azure/azure-sdk-for-js/pull/39505).

### 7.1 Breaking-change categories

#### 1. Request model names change

When a write view differs from the read view, an operation parameter changes from the canonical model to a suffixed model:

```ts
// Before
resource: Relationship

// After
resource: RelationshipCreateOrUpdate
```

This breaks consumers that import or explicitly annotate the old parameter type. It also adds the generated request model to the package's public exports. Common suffixes are `Create`, `Update`, and `CreateOrUpdate`.

#### 2. Optional read-only properties disappear from request types

Most existing JavaScript SDKs generate a single model for both reads and writes. Properties returned only by the service are therefore commonly included in the write model as optional and `readonly`: consumers do not need to set them, but the properties remain visible on the TypeScript type. Examples include provisioning state, generated IDs and URLs, status, timestamps, identity `principalId`/`tenantId`, and private-endpoint state.

Visibility splitting removes these properties entirely from the new request model. Although consumers normally do not set them, this can still require source changes:

1. **Reading a response-only property through a request-model variable no longer compiles.**

   ```ts
   // Before: Relationship was used for both requests and responses.
   function logState(model: Relationship) {
     console.log(model.properties?.provisioningState);
   }

   // After: the operation accepts RelationshipCreateOrUpdate, which does not
   // contain provisioningState.
   function logState(model: RelationshipCreateOrUpdate) {
     console.log(model.properties?.provisioningState); // TypeScript error
   }
   ```

2. **Object literals that explicitly include a removed property no longer compile.**

   ```ts
   const request: RelationshipCreateOrUpdate = {
     properties: {
       provisioningState: "Succeeded", // TypeScript error: unknown property
     },
   };
   ```

   Consumers should remove the property because the service owns its value.

Response models retain the read-only properties; only the request-side model graph is narrowed.

#### 3. Existing `*Update` models can become `*UpdateUpdate`

`ArmCustomPatchAsync` and `ArmCustomPatchSync` can create a top-level `*Update` model without removing read-only properties from models nested beneath it. If the visibility pass removes anything in that nested graph, the top-level model also needs a distinct projected clone. The mechanical naming rule therefore appends `Update` to the existing name:

- `HealthModelUpdateUpdate`
- `SchemaRegistryUpdateUpdate`
- `DisconnectedOperationUpdateUpdate`
- `AzureMonitorWorkspaceResourceUpdateUpdate`
- `DrillUpdateUpdate`

These models are not duplicate generic clones: they represent a second, nested visibility projection. The names are correct under the current rule but are awkward and create additional public API churn.

#### 4. Public exports and API-review baselines grow

Each non-collapsed projection introduces another public model and may introduce projected models for multiple levels of the object graph. Package entry points, API-review files, documentation, and generated serializers are updated accordingly. This is primarily additive, but removing or replacing hand-written workaround models can also rename or remove previously exported request types.

### 7.2 Rollout implications

The flag should not be enabled silently for an already released SDK. The following strategies could mitigate the breaking changes.

#### Option 1 — Enable for greenfield services and during brownfield major releases

Enable visibility splitting by default for new SDKs. Existing SDKs keep their current behavior until their next planned major version, where the generated API changes can be reviewed and released as intentional breaking changes.

**Pros**

- Produces consistent and accurate request models.
- Handles the changes through the normal major-version process.

**Cons**

- Delays the improvement for brownfield SDKs.
- Requires service teams to review a potentially large API change.
- Requires tracking the flag and enabling it when a major release occurs.

#### Option 2 — Add a brownfield compatibility mode

Add an option such as `preserve-optional-readonly-properties`. Brownfield packages would enable visibility splitting together with this compatibility option, retaining optional read-only properties in write models while still removing properties that cannot safely remain.

**Pros**

- Mitigates most optional read-only property removals.
- Reduces model renames and API-surface growth.

**Cons**

- Newly generated write models still expose optional read-only properties.
- Adds another generation mode to understand and maintain.

#### Option 3 — Add operation-level control (not recommended)

Operation-level control could work in either direction:

- **Opt-in:** keep the feature off and enable selected operations. New operations must be added manually, so visibility issues can be missed.
- **Opt-out:** enable the feature and disable selected operations. Brownfield packages may need a large exclusion list, and a missed operation can introduce an accidental breaking change.

Both approaches produce inconsistent behavior within a package and require ongoing list maintenance.

Option 1 provides the cleanest long-term model and is the recommended default. Option 2 reduces the initial brownfield impact at the cost of less accurate request models.

## 8. Open questions

- **Deserializer for write-only models:** `addSerializationFunctions` (`emit-models.ts`) emits **both** a serializer and a deserializer for every model, with no `usage & Output` gate. A projected `FooCreate` is write-only (request body only), so its deserializer is dead code. This is pre-existing baseline-emitter behavior (any input-only model gets an unused deserializer too), not introduced by the split. Decide: should we gate deserializer emission on `UsageFlags.Output`? Note the fix would be a general emitter change affecting all input-only models, not just projected ones.
