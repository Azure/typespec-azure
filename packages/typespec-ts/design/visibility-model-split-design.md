# Visibility-Based Model Splitting in `@azure-tools/typespec-ts`

## 1. Problem statement

Azure resources frequently contain required, service-owned properties such as `id`, `name`, and `provisioningState` that are visible only in responses:

```typespec
model Widget {
  @visibility(Lifecycle.Read)
  id: string;

  name: string;
}
```

The TypeScript emitter currently generates one interface for both requests and responses:

```ts
export interface Widget {
  readonly id: string;
  name: string;
}
```

`readonly` prevents reassignment but does not remove `id` from the request type, so callers must provide a value owned by the service. The proposed split gives requests an accurate write shape while responses retain the full read model.

Today, roughly a dozen specs use JavaScript-specific write models and `@@alternateType` customizations to fix sample-generation failures. A generated sample correctly omits read-only properties from the request. However, those properties are required by the shared request-and-response model, so the sample does not satisfy the TypeScript request type and fails to compile. This can occur in either the direct input model or a nested input model. The workaround replaces the operation input with a write model that does not contain the read-only properties.

## 2. Cross-language investigation

The generated Azure SDKs show that this problem is specific to TypeScript:

| Language | How required read-only properties are handled in requests |
| --- | --- |
| **TypeScript** | Uses the shared model, so required read-only properties remain required inputs. |
| **C# and Java** | Construction APIs expose only properties that callers can set. |
| **Go** | Model fields are optional pointers. |
| **Python** | Read-only properties are omitted from the typed constructor. |

**Takeaway:** other languages do not require callers to provide read-only values. TypeScript should provide the same behavior.

## 3. Design proposals

### 3.1 Proposal 1 — Always split

Create a visibility-suffixed model for every model reachable from a request body, even when its write and read shapes are identical.

**Pros**

- Uses one uniform rule: every request-reachable model has a visibility-specific name.
- Keeps request-model identity stable when visibility metadata changes, avoiding base/projection transitions.

**Cons**

- Creates projected models even when their shapes are identical to the base models, producing the largest public surface.
- Changes existing request type names even when no property is removed.
- Has the highest measured generated-name collision count.

### 3.2 Proposal 2 — Split whenever the write graph differs

Create a projected model when any property in the model or its nested models is not included in the operation's request payload.

Once a split is required, the projected graph contains the complete write view: both required and optional response-only properties are removed.

**Pros**

- Produces a complete write-specific model graph whenever the request shape differs.
- Reuses the base model when the write and read graphs are identical.
- Creates substantially fewer projected models and generated-name collisions than Proposal 1.

**Cons**

- Removes optional response-only properties from existing request types, which can cause source breaks.
- A future API version can change an operation's input from `Widget` to `WidgetCreate`, or back, when its request and response shapes become different or identical.

### 3.3 Proposal 3 — Split only for required read-only properties

Create a projected model only when the reachable write graph contains a **required** property that is excluded from the request payload. Optional read-only properties alone do not trigger a split.

Once a split is required, the projected graph still contains the complete write view; the proposal changes only the condition that creates the graph, not how that graph is projected.

**Pros**

- Removes required response-only properties from request types while preserving the base model for optional-only differences.
- Creates the fewest projected models and changes the fewest current operation inputs in the repository-wide investigation.

**Cons**

- Request models with only optional response-only properties still expose properties that are not accepted in the write payload.
- Adding or removing an excluded required property, or changing an excluded property between optional and required, can switch an operation between a base and projected model name.

### 3.4 Investigation comparison

The repository-wide investigation measures all three proposals across **185** multi-version TypeSpec projects and **513** adjacent version upgrades. A current breaking change is counted when an operation input changes from its current base model to a projected model.

| Concern | Proposal 1: always split | Proposal 2: any write difference | Proposal 3: required read-only |
| --- | --- | --- | --- |
| Projected models in the latest versions of 185 projects | **10,959** | **3,735** | **1,286** |
| Base/projection transitions across 513 version upgrades | **0** because projected models are always emitted  | **15** transitions across **12** upgrades | **1** transition across **1** upgrade |
| Changed operation inputs in the latest versions (breaking change) | **2,831** across **179** projects | **1,516** across **151** projects | **1,227** across **142** projects |
| Generated-name collision rows | **90** | **11** | **6** |


Proposal 3 still changes **1,227** operation inputs. This is because a required read-only property can be inside an optional child model:

```typespec
model Parent {
  child?: Child;
}

model Child {
  @visibility(Lifecycle.Read)
  id: string;
}
```

A sample can omit `child`, so this case may not cause a sample failure. However, callers that provide `child` should not be required to set `id`. The emitter therefore creates `ChildCreate` without `id` and `ParentCreate` that references `ChildCreate`.

This parent propagation explains why Proposal 3 still produces **1,286** projected models. The table measures changed public input types, not sample failures or downstream source-code changes. Existing JavaScript customizations reduce only the operations they explicitly replace.

## 4. Implementation

The implementation is shared by all three proposals. The prototype uses Proposal 2; Proposals 1 and 3 require only a different seed condition in the mark phase.

### 4.1 Projection engine

The implementation uses stable `@typespec/http` helpers as an oracle and materializes `SdkModelType` clones over the existing TCGC graph:

- `resolveRequestVisibility(program, operation, verb)` resolves the request visibility (POST→Create, PUT→Create | Update, PATCH→Update, and so on).
- `MetadataInfo.isPayloadProperty(prop, visibility)` determines whether a property belongs in the request payload.
- `getVisibilitySuffix(visibility, Visibility.Read)` supplies the projected model suffix (`Create`, `Update`, `CreateOrUpdate`, or `Query`).

`@typespec/http-canonicalization` was also evaluated, but it produces compiler `Type`s in a separate mutation realm. Feeding those types back into TCGC breaks realm-keyed caches and relies on an experimental API, so it is not used.

### 4.2 Integration location

The split is implemented as an emitter-local pre-pass. The emitter clones models, repoints operation bodies, and registers the projected models in `sdkPackage.models`.

This keeps the behavior JavaScript-specific, avoids a TCGC release, and preserves the canonical TCGC graph for other emitters. Source-model decorators such as `@clientName` and `@access` are already represented on `SdkModelType`, so shallow clones inherit them.

The main tradeoff is name collision handling: if a generated `FooCreate` conflicts with an existing model, the emitter binder currently falls back to a positional name such as `FooCreate_1`.

### 4.3 Graph rewrite

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

#### Phase 1 — Collect

`collectMethodRoots` and `collectNode` resolve the write visibility from the verb, then DFS from each model-typed body root to build one node per `(model, visibility)`. Each node records references through direct model properties and array element types, plus whether it omits any own property under this visibility. Proposal 3 would additionally record whether any omitted own property is required. Nodes are seeded *before* recursing, so the `Detail → Detail` back-edge terminates; the source graph is never mutated.

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

#### Phase 2 — Mark

`markNodesNeedingClones` seeds and reverse-propagates `needsClone` through the graph:

- **Proposal 1:** seed every request-reachable node.
- **Proposal 2:** seed every node whose `ownPropertyDropped` is true.
- **Proposal 3:** seed every node that drops at least one required own property.

The graph preserves projected references through all parent models. For Proposals 2 and 3, a parent needs a clone when it can reach a seeded child; Proposal 1 has already seeded every request-reachable parent. The transitive closure needs no special-casing for cycles, mutual recursion, or discriminated trees.

```
 Widget  ✔ needsClone   (own drop: id)
 Detail  ✔ needsClone   (own drop: secret; Widget reaches it too)
 Meta    ·  collapses   (reaches no drop → no clone, reused as-is)
```

#### Phase 3 — Build clones

`buildClones` first allocates an empty shell, named with `getVisibilitySuffix`, for every node that needs a clone. A second pass wires the shells once all of them exist: it drops all non-payload properties, repoints direct model references and array element models, and updates `baseModel` and `discriminatedSubtypes` for discriminated nodes. Array types are shallow-cloned only when their element type changes. Shells-before-wiring lets the `Detail` self-cycle repoint to the clone rather than the read model.

```
 WidgetCreate {                 DetailCreate {              Meta  (reused, no clone)
   name                           label
   detail ──► DetailCreate        next ──► DetailCreate     // self-cycle → clone
   meta   ──► Meta              }
 }
 // dropped (both @Read): Widget.id, Detail.secret
```

#### Phase 4 — Link

`repointMethodBody` points each model-typed method parameter—and the payload side (`bodyParam.type` for a non-spread body, or the matching wrapper property for a spread body)—at its clone. Responses are left alone, so the read graph survives.

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

Enabling `experimental-split-models-by-visibility` does **not** change the service's HTTP contract, but it can change the public TypeScript API of an existing SDK. Request types become a more accurate representation of the write payload; consumers that import, annotate, or construct the previous shared models may require source changes.

Section 3.4 compares the model growth, version stability, and current operation-input changes for all three proposals. The following categories explain how those changes affect SDK users.

### 7.1 Breaking-change categories

#### 1. Request model names can change

When a write view differs from the read view, an operation parameter changes from the shared model to a suffixed request model:

```ts
// Before
resource: Relationship

// After
resource: RelationshipCreateOrUpdate
```

This can break consumers that import or explicitly annotate the previous parameter type. Common suffixes are `Create`, `Update`, and `CreateOrUpdate`.

With Proposals 2 and 3, model names can also change across API versions. For Proposal 2, adding any read-only property can change `Widget` to `WidgetCreate`; for Proposal 3, the transition occurs when an excluded property becomes required. Removing the last triggering difference can change the request type back to `Widget`.

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

#### 3. Public exports and API-review baselines grow

Each non-collapsed projection introduces another public model and may introduce projected models for multiple levels of the object graph. Package entry points, API-review files, documentation, and generated serializers are updated accordingly. This is primarily additive, but removing or replacing hand-written workaround models can also rename or remove previously exported request types.

### 7.2 Adoption implications

The flag should not be enabled silently for an already released SDK. New SDKs can adopt the selected proposal from their first release; existing SDKs should adopt it as an intentional compatibility change, typically at a major-version boundary.
