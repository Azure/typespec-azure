# Versioned and customizable views for `resolveArmResources`

## Status

Proposed design for `@azure-tools/typespec-azure-resource-manager`.

## Summary

`resolveArmResources(program)` currently returns a provider-wide view of ARM resources and
operations discovered from decorator metadata in the compiled `Program`. That behavior is useful
to consumers that need the complete, multi-version declaration graph, and it must remain the
default.

This design adds an opt-in selected-version view and an opt-in metadata naming hook:

- A call without options preserves the current multi-version behavior and cache semantics.
- A call with `version` resolves the requested service snapshot using
  `@typespec/versioning`, then resolves resources only from types in that snapshot.
- A dependency-neutral callback can replace resource names, operation names, and operation-group
  names after ARM resource identity and operation association are complete. All three are logical
  metadata and are not part of the wire API.
- Wire identity is never customizable: provider names, resource type path segments, HTTP paths,
  serialized parameter names, and `resourceInstancePath` continue to come from the ARM and HTTP
  metadata.

The implementation should refactor the resolver around an internal resolution context. The
context identifies the namespace root and, for a versioned call, the mutation realm that owns the
selected snapshot. All discovery operations must use that context rather than reading an
unfiltered, program-wide state map.

The implementation must cache each projected snapshot by program, provider namespace, and
version. `getVersioningMutators` creates new mutator objects on each call, while the compiler
mutation cache is keyed by mutator identity. Without an ARM-owned snapshot cache, repeated calls
would create and retain additional realms and repeatedly register decorator state.

## Goals

1. Return resources and operations as they exist in one selected API version, including projected
   TypeSpec `Model`, `Operation`, `Interface`, property, and HTTP metadata.
2. Preserve the existing `resolveArmResources(program)` multi-version result and avoid changing
   existing callers.
3. Prevent original and projected types from being mixed in a selected-version result.
4. Prevent projected types from entering the default result after a selected-version call.
5. Prevent one version, one naming policy, or call ordering from contaminating another result.
6. Allow TCGC-aware consumers to supply client-facing logical names without introducing an ARM to
   TCGC package dependency.
7. Clearly distinguish logical names from ARM wire identity.
8. Provide diagnostics for unknown or ambiguous versions.
9. Make the resolver's invariants and maintenance workflow discoverable to AI coding tools.

## Non-goals

- Changing the TypeSpec versioning mutation implementation.
- Replacing TCGC naming APIs or reproducing their language-scope rules in the ARM package.
- Making `resolveArmResources` a complete SDK code model.
- Applying client names to HTTP paths, ARM resource type segments, serialized property names, or
  request and response schemas.
- Changing how the current multi-version resolver associates operations with resources.
- Solving general multi-service selection in the first change. The resolver retains its current
  provider-selection behavior.

## Terminology: logical names and wire identity

The following returned fields are logical metadata, not part of the wire API:

- `ResolvedResource.resourceName`;
- `ArmResourceOperation.name`; and
- `ArmResourceOperation.operationGroup`.

They are suitable for consumer-specific naming, including TCGC client names.

Wire identity and wire shape include:

- `resourceType.provider`;
- `resourceType.types`;
- `resourceInstancePath`;
- HTTP paths and methods;
- serialized parameter and property names; and
- request and response shapes.

Parent and scope links are structural relationships derived from wire identity. Changing a logical
name must not change those relationships.

## Current implementation

### Public result

The public result is a `Provider` containing:

- `resources`, each represented by `ResolvedResource`;
- lifecycle, list, action, and associated operations;
- non-resource `providerOperations`;
- TypeSpec references such as `ResolvedResource.type` and
  `ArmResourceOperation.operation`; and
- derived ARM identity such as `resourceType`, `resourceInstancePath`, parent, and scope.

The entry point is `packages/typespec-azure-resource-manager/src/resource.ts`:

```ts
export function resolveArmResources(program: Program): Provider;
```

Its high-level sequence is:

1. Resolve the provider namespace.
2. Return `armResolvedResources` if a cached result exists.
3. Enumerate entries registered by ARM decorators.
4. Resolve operation and HTTP metadata for each resource model.
5. Derive resource identity, parents, and scopes.
6. Add unassociated provider operations.
7. Cache the result by provider namespace.

### Decorator metadata

ARM decorators register metadata while the TypeSpec program is checked. Important state includes:

| State key | Key type | Purpose |
| --- | --- | --- |
| `armResources` | `Model` | Registered ARM resource details and the resource TypeSpec model |
| `armResourceOperations` | `Model` | Lifecycle, list, and action operation metadata |
| `resourceOperationList` | `Model` | Operation identifiers associated with a resource |
| `armResourceOperationData` | `Operation` | Identifies operations marked as ARM resource operations |
| `armProviderNamespaces` | `Namespace` | ARM provider namespace metadata |
| `armSingletonResources` | `Model` | Singleton resource metadata |
| `resourceBaseType` | `Model` | Resolved ARM resource base kind |
| `armBuiltInResource` | `Model` | Virtual or built-in resource metadata |
| `customAzureResource` | `Model` | Custom resource metadata |

Derived caches include:

| State key | Key type | Purpose |
| --- | --- | --- |
| `armResolvedResources` | `Namespace` | Fully resolved `Provider` result |
| `armResourcesCached` | `Model` | Fully resolved legacy `ArmResourceDetails` |

`registerArmResource` stores the concrete model in `typespecType`. Operation decorators similarly
store concrete `Model` and `Operation` references. These references are correct for the graph in
which the decorators execute, but a program may later contain both original and mutation-realm
entries.

### Existing versioning interaction

`@typespec/versioning` exposes `getVersioningMutators(program, namespace)`. For a versioned service
it returns one snapshot mutator for each root API version. Applying a mutator with
`unsafe_mutateSubgraphWithNamespace` creates a `Realm` and a projected namespace graph.

The version mutator:

- removes types and members unavailable in the selected version;
- restores names from before `@renamedFrom`;
- restores property and return types from before type changes; and
- restores required or optional state.

Mutating a graph can cause decorators to execute for realm-owned copies. ARM state may consequently
contain entries for original types and one or more projected copies. The existing
`listArmResources` workaround deduplicates by namespace-qualified type name and keeps the first
entry. That prevents duplicate resources in the default view, but it cannot select the correct
copy for a requested version.

### Current cache hazards

The current cache assumes one logical result per provider namespace. A selected-version API adds
two more dimensions:

- selected API version or mutation realm; and
- consumer-supplied naming policy.

Caching a customized result in `armResolvedResources` would make output depend on call order. A
program-wide clear would also disturb the existing multi-version view and other emitters using the
same `Program`.

## Design principles

### Preserve the default path

The no-options overload remains the compatibility boundary:

```ts
resolveArmResources(program);
```

It continues to return the current multi-version view and may continue to use the existing
provider cache. Version filtering is never enabled implicitly, including after another emitter
has created versioning mutation realms.

Legacy resource and operation enumeration must exclude every realm-owned type. Qualified-name
deduplication is not sufficient because a historical snapshot can rename a clone, causing its
qualified name to differ from the original and leak into the default view.

### Select a graph, not a version label

After a version is selected, every TypeSpec reference in the result must come from the selected
graph. Filtering only the final `Provider` by a version availability predicate is insufficient
because it would leave:

- models with properties from the wrong version;
- renamed types and operations with current rather than historical names;
- operation return types from the wrong version;
- HTTP metadata computed from unprojected operations; and
- decorator metadata containing original type references.

The selected-version path therefore resolves from a projected namespace graph.

### Filter state at every discovery boundary

Program state is an index, not proof that an entry belongs to the selected snapshot. Every ARM
state enumeration used by the selected-version path must require that its key belongs to the
selected realm.

Lookup by an already-selected realm type can continue to use the normal state accessor. Enumeration
must be realm-aware.

### Separate structural and display metadata

Although resource, operation, and operation-group names are not wire API, the current resolver uses
the logical resource name as an internal grouping signal in some association paths. Applying
consumer-specific names before association could therefore split one resource into multiple
resources or merge unrelated resources. This is an implementation-ordering concern, not a claim
that the logical name is wire identity.

Resolution therefore has two phases:

1. Structural resolution using ARM, HTTP, and TypeSpec names.
2. Optional logical-name transformation on the completed result.

No naming callback participates in resource identity, path parsing, parent resolution, scope
resolution, operation association, deduplication, or cache keys.

## Proposed public API

Add an options overload while retaining the existing signature:

```ts
export function resolveArmResources(program: Program): Provider;

export function resolveArmResources(
  program: Program,
  options: ResolveArmResourcesOptions,
): Provider;
```

The initial options shape is:

```ts
export interface ResolveArmResourcesOptions {
  /**
   * Exact value of a member in the service's @versioned enum.
   *
   * When omitted, resolution uses the existing multi-version view.
   */
  version?: string;

  /**
   * Optional consumer-owned resolver for logical metadata names.
   *
   * The callback runs after structural ARM resolution. Returning undefined
   * preserves the name produced by the ARM resolver.
   */
  nameResolver?: ArmMetadataNameResolver;
}
```

Use one discriminated callback rather than callbacks tied to TCGC concepts:

```ts
export type ArmMetadataNameKind = "resource" | "operation" | "operation-group";

export interface ArmMetadataNameRequest {
  kind: ArmMetadataNameKind;
  program: Program;
  version?: string;
  defaultName: string;

  /**
   * TypeSpec declaration that owns the logical name.
   *
   * - resource: Model
   * - operation: Operation
   * - operation-group: Interface
   */
  type: Model | Operation | Interface;

  /**
   * Resource model associated with operation metadata, when available.
   */
  resourceType?: Model;

  /**
   * ARM identity of the resolved resource occurrence, when available.
   *
   * These values are context for choosing a logical name and cannot be changed.
   */
  resolvedResourceType?: ResourceType;
  resourceInstancePath?: string;

  /**
   * True when ARM metadata explicitly supplied the logical resource name.
   */
  isExplicit?: boolean;
}

export type ArmMetadataNameResolver = (
  request: ArmMetadataNameRequest,
) => string | undefined;
```

Reasons for this shape:

- It has no TCGC imports or TCGC types.
- A consumer can close over a `TCGCContext`, emitter language scope, or any other naming service.
- One callback gives future name kinds an additive extension path.
- `defaultName` makes fallback behavior explicit.
- `type` is the projected type in a selected-version call.
- The discriminator prevents a resolver from accidentally treating operation groups as models.

The callback contract should state:

- return `undefined` to retain `defaultName`;
- return a non-empty string to replace logical output metadata;
- exceptions propagate to the caller;
- callbacks must not mutate TypeSpec types or the supplied result;
- callbacks may be invoked more than once for the same TypeSpec type; and
- invocation order is not part of the API contract.

If a callback returns an empty string, report an ARM diagnostic targeted at the supplied TypeSpec
type and retain `defaultName`. Empty names should not silently enter the result.

### TCGC adapter example

TCGC remains responsible for its naming precedence and language scopes:

```ts
const tcgcContext = createTCGCContext(program, emitterName);

const provider = resolveArmResources(program, {
  version: selectedVersion,
  nameResolver: ({ kind, type }) => {
    switch (kind) {
      case "resource":
      case "operation":
      case "operation-group":
        return getLibraryName(tcgcContext, type, languageScope);
    }
  },
});
```

The actual adapter may choose `getClientNameOverride` instead of `getLibraryName` if it wants only
explicit `@clientName` values and not `@friendlyName` or generated template names. That policy
belongs to the consumer, not the ARM library.

The consumer is responsible for aligning the TCGC context's selected API version with the
`version` passed to `resolveArmResources`. The ARM package cannot validate TCGC context options
without introducing the dependency this hook is intended to avoid.

### Names that can change

The callback can affect these non-wire logical fields:

- `ResolvedResource.resourceName`;
- `ArmResourceOperation.name`;
- `ArmResourceOperation.operationGroup`; and
- `ArmResourceOperation.resourceName` and `resourceModelName` where they correspond to the renamed
  resource metadata.

The implementation must update all aliases of an operation consistently. A single operation may
appear under lifecycle metadata, actions, lists, associated operations, or provider operations.

One model can produce several resolved resource occurrences at different paths. Resource naming
requests therefore include `resolvedResourceType` and `resourceInstancePath`; consumers must not
assume that the TypeSpec model alone uniquely identifies a returned resource.

The resolver does not enforce uniqueness after logical naming. A consumer can intentionally assign
the same logical name to multiple resources or operations. Structural association and
deduplication have already completed, and entries remain distinguishable by their TypeSpec
references and ARM identity.

### Names that cannot change

The callback must not affect:

- `ResolvedResource.resourceType.provider`;
- `ResolvedResource.resourceType.types`;
- `ResolvedResource.resourceInstancePath`;
- `ResolvedResource.providerNamespace`;
- HTTP method, path, parameters, bodies, or responses;
- serialized names;
- singleton keys;
- parent and scope identity; or
- resource matching and operation association.

These fields represent the ARM wire contract or structural relationships, unlike the customizable
logical name fields.

### Synthetic parents

The resolver can create a parent `ResolvedResource` when a path describes a parent for which no
declared resource record exists. A synthetic parent has no authoritative TypeSpec model of its own.

Track synthetic parents when they are created, for example in an internal
`WeakSet<ResolvedResource>` owned by the resolution context or through an internal-only source
field. Do not call the resource name resolver for a synthetic parent using the child model as a
proxy. Retain the path-derived parent name.

## Selected-version resolution

### Version selection

The selected-version path performs these steps:

1. Resolve the original provider/service namespace using existing behavior.
2. Call `getVersioningMutators(program, providerNamespace)`.
3. Handle the result:
   - `undefined`: the service is not versioned. Resolve the original graph. A supplied `version`
     is invalid and should produce a diagnostic.
   - `kind: "transient"`: apply the transient mutator. There is no root service version to match,
     so a supplied version is invalid.
   - `kind: "versioned"`: find exactly one snapshot whose `version.value` equals the requested
     string.
4. Apply the selected mutator with `unsafe_mutateSubgraphWithNamespace`.
5. Require the returned type to be a `Namespace`.
6. Require a non-null mutation realm. A versioned snapshot that produces no realm is an internal
   consistency error; it must not fall back to legacy enumeration.
7. Cache the projected namespace and realm by program, provider namespace, and version.
8. Create a realm-aware resolution context.
9. Invalidate derived ARM cache entries for that realm.
10. Resolve resources and operations from the projected namespace and realm-owned metadata.
11. Apply optional logical naming.

Version matching is exact and case-sensitive because API version enum values are wire values.
There is no implicit `latest` value in this API. Consumers that want latest should select it from
the version enum before calling the resolver.

### Diagnostics

Add diagnostics for:

- a version supplied for an unversioned service;
- a version supplied for a transient-only service;
- no snapshot matching the requested version;
- multiple snapshots matching the requested version, treated as an internal consistency failure;
  and
- an empty name returned by a custom name resolver.

The first three diagnostics should include the requested version and available root version values.
The resolver should report the diagnostic through the program and return an empty `Provider`,
matching the existing ability to return an empty provider when no ARM provider namespace exists.

If callers need a result-plus-diagnostics API in the future, a separate
`resolveArmResourcesWithDiagnostics` function can be added without changing the compatibility
signature.

### Internal resolution context

Refactor the existing implementation to use an internal context:

```ts
interface ArmResourceResolutionContext {
  program: Program;
  providerNamespace: Namespace;
  version?: string;
  realm?: unsafe_Realm;
  nameResolver?: ArmMetadataNameResolver;
  cacheMode: "legacy" | "none";
}
```

The context provides these predicates:

```ts
function isTypeInResolution(
  context: ArmResourceResolutionContext,
  type: Type,
): boolean;

function isContainerInResolution(
  context: ArmResourceResolutionContext,
  type: Namespace | Interface,
): boolean;
```

Semantics:

- In a versioned realm, a type is eligible only when
  `unsafe_Realm.realmForType.get(type) === context.realm`.
- In the legacy path, exclude all types for which `unsafe_Realm.realmForType.has(type)` is true,
  then retain qualified-name deduplication as protection against duplicate original registrations.
- Namespace and operation traversal starts at `context.providerNamespace`, never by resolving the
  original provider again.

The exact-realm test is intentional. Testing only `realm.hasType(type)` is insufficient for an
entry copied from another realm, and accepting original types through the realm state fallback
would recreate the mixed-view bug.

ARM resource models, their operations, and operation interfaces are expected to be cloned into the
selected realm. Assert and test this invariant. If a future compiler optimization leaves one of
these declarations unowned by the realm, fail with an internal diagnostic rather than silently
returning an incomplete provider.

### Resource enumeration

Introduce an internal overload or helper:

```ts
function listArmResourcesForResolution(
  context: ArmResourceResolutionContext,
): ArmResourceDetails[];
```

For the legacy context it delegates to `listArmResources(program)` after that helper is strengthened
to exclude realm-owned resource models.

For a selected-version context it:

1. Enumerates registered ARM resource details.
2. Keeps entries whose `typespecType` belongs to the selected realm.
3. Requires the model to be reachable from the projected provider namespace.
4. Deduplicates only duplicate registrations of the same realm-owned model identity.

It must not deduplicate selected-version resources by qualified name across original and realm
types. Qualified-name first-write-wins is specifically the wrong selection mechanism for a
versioned view.

Reachability protects against realm entries from another service when several service mutators
have run against the same program.

### Operation enumeration

Operation lookup begins with each selected resource model. The following references must belong to
the same selected realm:

- the `resourceOperationList` key;
- each `ArmOperationIdentifier.operation`;
- each `ArmOperationIdentifier.resource`, when defined;
- each `ArmResourceOperationData.operation`;
- operations traversed for `providerOperations`; and
- interfaces containing those operations.

An operation whose key is realm-owned but whose stored value references an original operation is
stale metadata. Do not substitute the original operation or silently omit it. Report an internal
diagnostic and fail resolution for that selected view.

`getAllOperations` must take the projected provider namespace explicitly. It must not call
`resolveProviderNamespace(program)` in a selected-version context.

### HTTP metadata

Call `getHttpOperation` with the projected `Operation`. This ensures that:

- an operation removed in the selected version is absent;
- versioned parameter and return types are projected;
- projected route metadata is used; and
- returned `httpOperation.operation` references the projected operation.

Do not compute HTTP metadata on the original operation and then attach it to a projected resource.

## State and cache handling

### Classify state

State should be treated as one of two classes:

1. Registration state produced by decorators and keyed by TypeSpec declarations.
2. Derived resolution caches produced by JavaScript helper APIs.

Registration state should normally be selected by realm, not cleared globally. Derived caches
should be invalidated for the selected graph before resolution.

### Derived caches to invalidate

Before resolving a selected version:

- delete any `armResolvedResources` entry keyed by the projected provider namespace;
- delete `armResourcesCached` entries keyed by models in the selected realm; and
- clear any future derived cache through one central internal helper.

Add:

```ts
function clearArmResourceResolutionCaches(
  program: Program,
  selector: (type: Type) => boolean,
): void;
```

Keep the list of derived keys in one place and document every new ARM cache as registration or
derived state. This avoids another partial invalidation path.

Do not clear the original provider's cached multi-version result. The existing no-options call
must remain stable before and after selected-version calls.

### Registration state with stale embedded references

Some decorator or JavaScript API state can be keyed by a projected type while containing an
original type in its value. The selected-version implementation must not trust the key alone.

Use one of these mechanisms for each affected state shape:

1. Prefer filtering and validating embedded TypeSpec references at read time.
2. If decorator execution copies stale values before projected types are finalized, add an
   internal ARM state-reset mutator that removes the affected realm-owned state entry before the
   decorator is reapplied.
3. If neither is possible, reconstruct the small metadata record from the projected declaration
   and public decorator accessors.

The first implementation should use read-time filtering because it is localized to ARM and does
not depend on compiler decorator-finalization order. Add a state-reset mutator only for a state
shape proven by a regression test to retain stale embedded references.

Never clear registration maps program-wide. Doing so would remove the metadata required by the
legacy multi-version view and other emitters sharing the program.

### Resolver result caching

Use this policy:

| Call shape | Provider cache |
| --- | --- |
| No options | Existing `armResolvedResources` cache |
| Name resolver only | Resolve or clone from the raw legacy result, then transform names; never cache customized output |
| Selected version | Cache the projected snapshot; optionally cache its structural `Provider` by projected namespace |
| Selected version plus name resolver | Reuse the snapshot or structural provider; never cache customized output |

Add an ARM-owned snapshot cache:

```ts
interface ArmVersionSnapshot {
  providerNamespace: Namespace;
  realm: unsafe_Realm;
}

WeakMap<Program, Map<Namespace, Map<string, ArmVersionSnapshot>>>
```

This cache is required for correctness and memory stability, not only performance.
`getVersioningMutators` creates fresh mutator objects on each call, and the compiler mutation cache
uses mutator object identity. Reusing only a mutator is also insufficient: a later mutation engine
can return cached clones owned by an earlier realm. Reuse the complete projected namespace and
realm as one unit.

Any versioned structural `Provider` cache must be keyed by the projected provider namespace or
realm identity and must store only the uncustomized provider.

### Avoid mutating cached results

The current result contains object references between child resources, parents, and scope
resources. A naming pass must not mutate a cached structural `Provider`.

Implement a graph-preserving copy:

1. Allocate a new `ResolvedResource` for every resource.
2. Copy operation records that contain customizable fields.
3. Reconnect `parent` and resource-valued `scope` through an old-to-new resource map.
4. Preserve TypeSpec and immutable HTTP metadata references.
5. Apply names to the copied graph.

Alternatively, build an uncached result whenever `nameResolver` is supplied. The graph-preserving
copy is preferred because it avoids repeating HTTP and resource association work for the legacy
view.

## Naming transformation details

### Resource names

For each declared `ResolvedResource`, invoke:

```ts
nameResolver({
  kind: "resource",
  program,
  version,
  defaultName: resource.resourceName,
  type: resource.type,
  resolvedResourceType: resource.resourceType,
  resourceInstancePath: resource.resourceInstancePath,
  isExplicit: /* retained from structural resolution */,
});
```

The current private `resourceNameIsExplicit` value should be retained long enough to populate the
request. It need not become a public `ResolvedResource` property unless another consumer needs it.

A non-empty callback result replaces only `ResolvedResource.resourceName` and corresponding
logical operation metadata. It does not replace resource type segments.

### Operation names

For every distinct returned `Operation`, invoke:

```ts
nameResolver({
  kind: "operation",
  program,
  version,
  defaultName: armOperation.name,
  type: armOperation.operation,
  resourceType,
});
```

Use an identity map keyed by `Operation` so all appearances of one operation get the same resolved
name and the callback is not repeatedly evaluated for aliases.

### Operation-group names

When `operation.interface` is defined, invoke:

```ts
nameResolver({
  kind: "operation-group",
  program,
  version,
  defaultName: armOperation.operationGroup,
  type: armOperation.operation.interface,
  resourceType,
});
```

All operations currently returned by this resolver belong to an interface. Keep the interface
guard in the naming pass so the callback remains safe if that prerequisite changes later.

### Naming precedence

The ARM package defines only this precedence:

1. Non-empty custom resolver result.
2. Existing ARM resolver name.

TCGC-specific precedence remains in TCGC. For example, `getLibraryName` currently incorporates
language-scoped `@clientName`, unscoped `@clientName`, `@friendlyName`, generated template names,
and the TypeSpec declaration name.

### Explicit logical ARM resource names

An explicitly supplied logical ARM resource name is included as `defaultName` with
`isExplicit: true`. It is still not wire metadata. The callback is allowed to override it because
the callback is an explicitly requested consumer view. Structural resolution has already
completed, so the override cannot alter resource association.

## Alternatives considered

### Filter the current multi-version result

This can remove resources and operations that are unavailable in a version, but it cannot safely
project renamed declarations, changed property types, changed return types, or decorator metadata.
It also leaves original TypeSpec references in the result.

Use post-filtering only as a defensive check after projection, not as the primary implementation.

### Add only `resolveArmResourcesForVersion`

A separate function is clear and could return diagnostics without overloading the existing shape.
However, version and naming are both view options over the same structural resolver. An options
overload keeps the API cohesive and leaves room for future view settings.

A separate convenience function can still be added later:

```ts
resolveArmResourcesForVersion(program, version, options);
```

It should delegate to the options overload rather than implement another path.

### Require consumers to mutate first

This avoids an ARM dependency on `@typespec/versioning`, but it exposes mutation ordering, realm
selection, cache invalidation, and state filtering to every consumer. Callers can easily pass the
original program and receive a mixed result. The ARM library already has a peer dependency on
`@typespec/versioning`, so it should own the invariant.

### Cache only the resolved provider by version string

A `(provider namespace, version string)` cache of a customized `Provider` does not account for
naming callback identity and is unsafe. A cache of the complete projection snapshot by
`(Program, provider namespace, version string)` is required. A structural provider may then be
cached by its projected namespace or realm identity.

### Import TCGC and call `getLibraryName`

This would create an undesirable dependency direction and force all ARM consumers to adopt TCGC
context, emitter scope, and naming policy. It could also create circular dependencies. The callback
keeps ownership with the consumer.

### Generic post-processing callback over `Provider`

Giving consumers an arbitrary mutable `Provider` callback is flexible but unsafe. It can change
wire identity, break parent references, or mutate cached output. A constrained name resolver
expresses the supported customization and preserves invariants.

## Implementation plan

### Phase 1: Refactor without behavior changes

1. Introduce `ArmResourceResolutionContext`.
2. Move the body of `resolveArmResources` to an internal resolver accepting the context.
3. Make provider-operation traversal accept an explicit namespace.
4. Keep the public no-options function on the legacy context and existing cache.
5. Add characterization tests proving no result changes.

### Phase 2: Selected-version view

1. Add options and version-selection diagnostics.
2. Select and apply the `@typespec/versioning` snapshot mutator.
3. Cache the projected namespace and realm as one snapshot.
4. Exclude all realm-owned entries from the default view.
5. Add realm-aware resource and operation enumeration.
6. Centralize derived-cache invalidation.
7. Add selected-version tests for presence, removal, rename, type change, and operation changes.

### Phase 3: Name resolver

1. Add public callback types.
2. Preserve structural name origin and explicitness until post-processing.
3. Mark synthetic resources so they are excluded from model-based naming.
4. Add graph-preserving copy and name transformation.
5. Test resource, operation, and operation-group names.
6. Add a TCGC integration test in the TCGC package using `getLibraryName`.
7. Assert that the ARM package manifest and source have no TCGC dependency or import.

### Phase 4: Documentation and API review

1. Add API reference comments and a usage example.
2. Regenerate package API documentation if the public types are included in generated docs.
3. Add a change description for the ARM package.
4. Review whether selected-version diagnostics need a result-plus-diagnostics convenience API.

## Test plan

### Compatibility tests

- Existing unversioned fixtures produce deeply equal results before and after the refactor.
- Existing versioned multi-version fixtures still produce the current result with no options.
- Calling the selected-version overload does not change a later no-options result.
- Calling the no-options overload first does not change a later selected-version result.
- Calling TCGC context creation before either overload does not introduce duplicates.

### Version membership

Create a service with at least three versions and verify:

- a resource added in V2 is absent in V1 and present in V2 and V3;
- a resource removed in V3 is present in V1 and V2 and absent in V3;
- an operation added or removed by version follows the same rule;
- provider operations are filtered as well as resource operations; and
- parent and scope records do not reference resources absent from the selected version.

### Projected type shape

Verify returned TypeSpec references:

- a model renamed in V2 has the historical name in V1 and current name in V2;
- a model property changed in V2 has the historical type in V1;
- a property made optional or required changes correctly;
- an operation return type changed in V2 has the historical type in V1;
- a removed property is absent;
- every declared returned model and operation belongs to the selected realm; and
- HTTP operation metadata points at the selected operation.

### State isolation and cache ordering

Run permutations in one compiled program:

1. legacy, V1, V2;
2. V2, V1, legacy;
3. V1 twice;
4. V1 with naming A, V1 with naming B;
5. legacy with naming A, legacy without naming; and
6. create TCGC context, V1, legacy.

Compare an explicit stable projection of the results: resource type segments, instance paths,
logical names, operation paths and verbs, and parent and scope identities. TypeSpec and HTTP
objects are graph references and are not suitable for unrestricted deep equality. Assert realm
ownership separately, and assert no cross-call name or version contamination.

### Stale embedded metadata

Add focused tests in which decorator arguments contain:

- a resource model;
- an operation;
- an operation return model; and
- a parent resource.

Verify that selected-version state references projected types. A test that exposes an original
reference should drive either read-time filtering or a targeted pre-finalization state reset.

### Naming

Verify:

- resource names can change;
- operation names can change;
- operation-group names can change;
- explicit ARM resource names are passed with `isExplicit: true`;
- `undefined` preserves defaults;
- empty names report a diagnostic and preserve defaults;
- one operation receives a consistent name everywhere it appears;
- synthetic parent names remain path-derived;
- wire resource type segments and paths never change; and
- two resolvers used sequentially do not mutate each other's results.

### TCGC integration

In `typespec-client-generator-core` tests:

- apply unscoped `@clientName` to a resource model, operation, and operation interface;
- apply language-scoped names and pass the matching scope through the adapter;
- verify `getLibraryName` values appear in logical ARM metadata;
- verify the selected-version callback receives projected types; and
- align the TCGC context and ARM resolver to the same selected version in the test; and
- verify ARM remains absent from TCGC's runtime dependency direction unless the test already uses
  the ARM package as a development dependency.

## Validation commands

Use the repository's mise-managed tools:

```powershell
mise exec -- pnpm -r --filter "@azure-tools/typespec-azure-resource-manager..." build
mise exec -- pnpm --filter "@azure-tools/typespec-azure-resource-manager" test
mise exec -- pnpm --filter "@azure-tools/typespec-client-generator-core" test
mise exec -- pnpm format
mise exec -- pnpm lint
```

Run the smallest targeted Vitest selectors while iterating, then the package suites above.

## Compatibility and rollout

- The change is additive at the TypeScript API level.
- The no-options overload remains the stable behavior.
- Consumers opt into projection and custom naming independently.
- Selected-version results contain different TypeSpec object identities by design because they
  reference projected types.
- The API should be marked as using TypeSpec's experimental mutation facility internally, but the
  mutator type is not exposed in the public signature.
- If compiler mutation APIs change, only the internal snapshot creation layer should need updates.

## Open implementation questions

These questions should be answered by prototype tests rather than assumptions:

1. Which ARM state records are reapplied with fully projected embedded references, and which need
   read-time validation or reset?
2. Can the graph-preserving naming copy share `HttpOperation` objects safely, or do any consumers
   mutate them?
3. Should invalid version selection return `{}` after reporting a diagnostic, or should a future
   diagnostics-returning convenience API be included in the first release?

`unsafe_mutateSubgraphWithNamespace` prepares namespace mutation from the program's global
namespace even when a service namespace is supplied as the requested root. TCGC passes the global
namespace so it can compose mutators for multiple services. The initial ARM design still targets
one provider namespace and stores the projected provider returned by the selected snapshot.

## Decision record

The recommended direction is:

1. Keep `resolveArmResources(program)` unchanged as the multi-version view.
2. Add an options overload with exact `version` and dependency-neutral `nameResolver`.
3. Use `@typespec/versioning` mutation for selected versions.
4. Cache each projected namespace and realm by program, provider namespace, and exact version.
5. Resolve through an explicit namespace-and-realm context.
6. Exclude all realm-owned types from the default view.
7. Filter selected registration state by exact realm and validate embedded type references.
8. Invalidate only derived cache entries belonging to the selected graph.
9. Never cache customized `Provider` results.
10. Apply logical naming after structural resolution on a non-cached result copy.
11. Allow resource, operation, and operation-group logical names to change.
12. Keep all ARM wire identity and structural relationships immutable while allowing all three
    logical name categories to change.
