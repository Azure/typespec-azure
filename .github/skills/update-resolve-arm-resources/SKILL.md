---
name: update-resolve-arm-resources
description: >
  Update, debug, or review the typespec-azure-resource-manager resolveArmResources API,
  including versioned resource views, operation association, ARM state and cache isolation,
  projected TypeSpec types, and dependency-neutral logical naming hooks.
allowed-tools: shell
---

# Update `resolveArmResources`

Use this skill for changes to `resolveArmResources`, `ResolvedResource`, `Provider`, ARM resource
operation resolution, selected-version ARM metadata, or integrations that consume this metadata.

Read
`packages/typespec-azure-resource-manager/rfcs/resolve-arm-resources-versioned-view.md`
before changing the API or its state and cache behavior.

## Purpose of the API

`resolveArmResources(program)` translates ARM decorators and HTTP metadata into a provider model
containing:

- declared ARM resources;
- resource lifecycle, list, action, and associated operations;
- non-resource provider operations;
- ARM resource type and instance-path identity;
- parent and scope relationships;
- singleton metadata; and
- references to the TypeSpec models and operations that produced the metadata.

The no-options API is a multi-version declaration view. A selected-version API must instead return
projected types and only declarations available in the requested API version.

## Core invariants

Preserve all of these invariants:

1. The no-options result remains backward compatible.
2. A selected-version result never mixes original types with types from a mutation realm.
3. Resource association is based on ARM and HTTP structural metadata before client-facing names
   are applied.
4. Resource names, operation names, and operation-group names are logical metadata, not wire API.
5. Wire identity never changes through a naming hook.
6. Consumer-specific names never enter a shared provider cache.
7. A call for one version cannot affect another version or the default view.
8. Parent and resource-valued scope references point into the same returned resource graph.
9. Provider operations are selected from the same namespace graph as resources.
10. Decorator state keyed by a projected type is not trusted until embedded type references are
   checked.
11. Program-wide ARM registration state is never cleared to prepare one selected version.
12. Repeated resolution of the same version reuses the same projected namespace and realm.

## Implementation map

Read these files together before editing:

| File | Responsibility |
| --- | --- |
| `packages/typespec-azure-resource-manager/src/resource.ts` | Public result types, main resolver, identity parsing, parent and scope resolution, provider operation traversal |
| `packages/typespec-azure-resource-manager/src/private.decorators.ts` | Resource registration and `listArmResources` |
| `packages/typespec-azure-resource-manager/src/operations.ts` | Resource operation registration and operation state |
| `packages/typespec-azure-resource-manager/src/namespace.ts` | Provider namespace registration and lookup |
| `packages/typespec-azure-resource-manager/src/state.ts` | ARM state keys |
| `packages/typespec-azure-resource-manager/test/resource-resolution.test.ts` | Resolver behavior and regression tests |
| `packages/typespec-client-generator-core/src/public-utils.ts` | TCGC `getLibraryName` policy |
| `packages/typespec-client-generator-core/src/decorators.ts` | TCGC `@clientName` lookup |
| `packages/typespec-client-generator-core/src/internal-utils.ts` | Existing version mutation usage |
| `core/packages/versioning/src/mutator.ts` | Snapshot mutator creation |
| `core/packages/compiler/src/experimental/mutators.ts` | Mutation and realm creation |
| `core/packages/compiler/src/experimental/realm.ts` | Realm ownership and state-map behavior |

## Resolution flow

The current resolver:

1. Finds the ARM provider namespace.
2. Checks the resolved-provider cache.
3. Enumerates decorator-registered resource models.
4. Resolves resource operation candidates and HTTP operations.
5. Detects resource identities from strict instance lifecycle paths.
6. Associates non-identity operations.
7. Resolves parent and scope relationships.
8. Collects unassociated provider operations.
9. Caches the provider result.

When modifying one stage, inspect its downstream assumptions. Resource names are logical metadata,
not wire API, but the current implementation uses them as an internal association signal.
External naming must therefore run after association.

## Versioning workflow

For a selected API version:

1. Resolve the original provider namespace.
2. Use `getVersioningMutators(program, providerNamespace)`.
3. Match the exact root version value.
4. Apply the snapshot with `unsafe_mutateSubgraphWithNamespace`.
5. Require and cache the returned namespace and non-null realm by program, provider namespace, and
   version.
6. Resolve from the cached namespace and realm, not by looking up the provider again.
7. Filter enumerated ARM state to exact realm-owned keys.
8. Validate embedded `Model`, `Operation`, `Interface`, and property references.
9. Clear only derived cache entries for the selected graph.
10. Compute HTTP metadata from projected operations.

`getVersioningMutators` creates new mutator objects each time, and the compiler mutation cache keys
on mutator identity. Never recreate a snapshot on every resolver call, and never cache only the
mutator. Cache the projected namespace and its owning realm together.

The default view must explicitly exclude all realm-owned types. Qualified-name deduplication is not
enough because historical snapshots can rename a projected type.

Do not implement a selected-version view by filtering only the final provider. Projection is
required for renames, type changes, optionality changes, removed members, and operation return
types.

## State and cache classification

Treat these as registration state:

- `armResources`
- `armResourceOperations`
- `resourceOperationList`
- `armResourceOperationData`
- `armProviderNamespaces`
- `armSingletonResources`
- `resourceBaseType`
- `armBuiltInResource`
- `customAzureResource`

Treat these as derived caches:

- `armResolvedResources`
- `armResourcesCached`

When adding a state key, document which class it belongs to. Add every new derived cache to the
central invalidation helper.

Realm state maps can fall back to parent program state for original types. An entry visible from a
realm is not necessarily owned by that realm. Check
`unsafe_Realm.realmForType.get(type) === selectedRealm`.

## Naming integrations

The ARM package must not import TCGC.

Expose or use a dependency-neutral callback that receives:

- name kind;
- projected TypeSpec declaration;
- current ARM logical name;
- selected version;
- associated resource model when relevant; and
- whether a resource name was explicit ARM metadata.

Apply naming only after structural resolution. All supported names are non-wire logical metadata:

- resource name;
- operation name; and
- operation-group name.

Never change:

- provider namespace;
- resource type path segments;
- resource instance path;
- HTTP path or method;
- serialized names;
- parent or scope identity; or
- singleton keys.

Do not describe resource names, operation names, or operation-group names as wire API. Only their
current use as internal resolver grouping data requires the post-resolution ordering.

Keep `ArmResourceOperation.resourceName` and `resourceModelName` consistent with resource naming.
Include resource type and instance path in resource naming requests because one model can produce
several resolved resource occurrences.

Track synthetic parents internally and do not invoke model-based naming for them. Current synthetic
parents reuse the child model in their `type` field, so model identity alone cannot distinguish
them.

For a TCGC integration test, let the consumer call `getLibraryName` or
`getClientNameOverride`. Do not duplicate TCGC precedence in ARM.

## Required tests

Start with failing tests for the requested behavior.

### Compatibility

- Existing unversioned result is unchanged.
- Existing multi-version result is unchanged when no version is supplied.
- Creating a TCGC context before resolution does not create duplicate resources.

### Selected versions

Use at least three versions and cover:

- resource added and removed;
- operation added and removed;
- model or operation renamed;
- property type changed;
- property made optional or required;
- operation return type changed;
- provider operation filtering; and
- parent and scope consistency.

Assert returned declared types belong to the selected realm.

### Isolation

Run different call orders in one compiled program:

- default then V1 then V2;
- V2 then V1 then default;
- the same version twice;
- different name resolvers for the same version; and
- named then unnamed resolution.

Compare stable scalar projections rather than deeply comparing embedded TypeSpec graphs. Assert
realm ownership separately. No custom name may leak to another call.

### Naming

- Rename a resource model, operation, and operation interface.
- Verify all aliases of one operation receive the same name.
- Verify paths and resource type segments remain unchanged.
- Verify synthetic parent names are not derived from the child model's client name.
- Verify empty callback results produce the intended diagnostic behavior.

## Common failure modes

- Deduplicating projected and original resources by qualified name. This can choose the original
  model for a selected version.
- Allowing a renamed realm type into the default view because its qualified name differs.
- Recreating version mutators and realms for every call.
- Caching a mutator without caching the projected namespace and its owning realm.
- Calling `resolveProviderNamespace(program)` after mutation. It can return the original namespace.
- Traversing all program operations instead of the selected provider namespace.
- Reusing `armResolvedResources` for a customized or versioned call.
- Mutating a cached `Provider` during post-processing.
- Checking only a state-map key while a value still references original types.
- Applying TCGC names before resource identity matching.
- Applying the child model's name to a synthetic parent.
- Renaming ARM wire resource type segments with a client name.
- Clearing ARM registration maps program-wide.
- Adding an ARM runtime dependency on TCGC.

## Editing rules

- Keep the no-options path explicit and easy to compare with previous behavior.
- Prefer a small internal resolution context over optional parameters threaded independently
  through many helpers.
- Use proper TypeScript types; do not use `any` to bypass realm or operation distinctions.
- Preserve existing resource graph references when copying results.
- Add comments only where realm ownership or cache isolation is non-obvious.
- Do not change unrelated resolver heuristics while adding version or naming support.
- If changing `.tsp` files, run `tsp format`.
- If changing decorator option models in `.tsp`, regenerate TypeScript types with `tspd`.

## Validation

Use mise from the repository root:

```powershell
mise exec -- pnpm -r --filter "@azure-tools/typespec-azure-resource-manager..." build
mise exec -- pnpm --filter "@azure-tools/typespec-azure-resource-manager" test
mise exec -- pnpm --filter "@azure-tools/typespec-client-generator-core" test
mise exec -- pnpm format
mise exec -- pnpm lint
```

During development, use targeted Vitest selectors first. Before a PR, add the required Chronus
change description for every affected package.
