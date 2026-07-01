# Design for `resolveArmResources`

## Expected output

`resolveArmResources(program)` should produce a complete, deterministic, version-aware description of the ARM provider shape represented by the TypeSpec program.

The API should make the version dimension explicit. For an unversioned TypeSpec program, it should return one provider result. For a versioned TypeSpec program, it should return provider results for each declared service version so downstream emitters and analyzers can reason about the resource shape that exists in each API version.

Each provider result should contain:

- `resources`: every ARM resource instance shape exposed by the provider, including tracked resources, proxy resources, extension resources, generic resources, and operation-discovered child or auxiliary resources.
- `providerOperations`: provider-level operations that belong to the ARM provider but are not associated with a specific resource, such as the standard `Operations.list` endpoint.

The API should work for every supported way a TypeSpec program can define or expose an ARM resource. This includes the recommended ARM resource templates, legacy resource templates, extension resource templates, generic resources, built-in/common resource shapes, custom resources, virtual/external resources, parent/child resources, singleton resources, and resources discovered from ARM operation templates or decorators.

Each resolved resource should include enough information for downstream emitters or analyzers to understand:

- the TypeSpec model that declared or owns the resource
- the public resource kind (`Tracked`, `Proxy`, `Extension`, or `Other`)
- the ARM provider namespace
- the resource type path, split into provider and type segments
- the canonical resource instance path
- grouped lifecycle, list, and action operations
- any associated non-lifecycle operations
- parent and scope relationships
- singleton metadata, when applicable

The result should preserve the relationship between service versions and resolved resources. If a resource or operation exists only in some versions, that difference should be visible in the API result instead of requiring callers to run separate version projections and compare results themselves.

The API should still avoid duplicate resources caused by versioning internals re-applying decorators on projected or realm-copied types.

## Output shape

The API should return an object that makes both the provider and version dimensions explicit. The exact type names can change during implementation, but the contract should include the following concepts:

```ts
interface ArmResourcesResolutionResult {
  providers: ResolvedProvider[];
}

interface ResolvedProvider {
  namespace: string;
  versions: ResolvedProviderVersion[];
}

interface ResolvedProviderVersion {
  version?: string;
  resources: ResolvedResource[];
  providerOperations: ArmResourceOperation[];
}

interface ResolvedResource {
  type: Model;
  kind: "Tracked" | "Proxy" | "Extension" | "Other";
  providerNamespace: string;
  resourceType: ResourceType;
  resourceName: string;
  resourceInstancePath: string;
  operations: ArmResolvedOperationsForResource;
  parent?: ResolvedResourceReference;
  scope?: ArmResourceScope;
  singleton?: SingletonResourceInfo;
}

interface ResourceType {
  provider: string;
  types: string[];
}

type ArmResourceScope =
  | "Tenant"
  | "Subscription"
  | "ResourceGroup"
  | "ManagementGroup"
  | "Scope"
  | ResolvedResourceReference;

interface ArmResolvedOperationsForResource {
  lifecycle: ArmResourceLifecycleOperations;
  lists: ArmResourceOperation[];
  actions: ArmResourceOperation[];
}

interface ArmResourceLifecycleOperations {
  read: ArmResourceOperation[];
  createOrUpdate: ArmResourceOperation[];
  update: ArmResourceOperation[];
  delete: ArmResourceOperation[];
  checkExistence: ArmResourceOperation[];
}

interface ArmResourceOperation {
  name: string;
  kind:
    | "read"
    | "createOrUpdate"
    | "update"
    | "delete"
    | "checkExistence"
    | "list"
    | "action"
    | "other";
  operationGroup: string;
  operation: Operation;
  path: string;
  httpOperation: HttpOperation;
  resourceName?: string;
  resourceModelName?: string;
}

interface ResolvedResourceReference {
  providerNamespace: string;
  resourceType: ResourceType;
  resourceName: string;
  resourceInstancePath: string;
  kind: "Tracked" | "Proxy" | "Extension" | "Other";
}

interface SingletonResourceInfo {
  keyValue: string | string[];
}
```

### `ResolvedResource`

Each `ResolvedResource` describes one concrete ARM resource path in one provider version.

| Property               | Description                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`                 | The TypeSpec `Model` that declares or owns the resource. For operation-discovered auxiliary resources, this may be the closest owning resource model.                                                              |
| `kind`                 | The public resource category. Recommended values are `Tracked`, `Proxy`, `Extension`, and `Other`. Unsupported or synthetic resources should use `Other` rather than leaking internal implementation kinds.        |
| `providerNamespace`    | The ARM provider namespace that owns this resolved resource. For extension resources, this is the extension provider namespace, not necessarily the namespace of the target resource.                              |
| `resourceType`         | The ARM resource type split into provider and type segments. For `Microsoft.Foo/widgets/extensions`, `provider` is `Microsoft.Foo` and `types` is `["widgets", "extensions"]`.                                     |
| `resourceName`         | The logical resource name used by operation grouping and downstream emitters. This may come from the resource model name, a template-provided `ResourceName`, or operation metadata.                               |
| `resourceInstancePath` | The canonical instance path for this resource in this version, including scope, provider namespace, type segments, and name segments. List operations should resolve to the same instance path as item operations. |
| `operations`           | Resource lifecycle, list, and action operations grouped by operation kind. These are the operations that directly operate on this resource path.                                                                   |
| `parent`               | A reference to the parent resource when this resource is a child resource. The parent may be declared directly or synthesized from the path.                                                                       |
| `scope`                | The scope where this resource exists. This can be a well-known ARM scope string or a structured reference to another resource used as the extension target.                                                        |
| `singleton`            | Singleton metadata when the resource has a fixed name segment, such as `default`, or a fixed set of allowed singleton names.                                                                                       |

## High-level flow

1. Find the ARM provider namespace with `resolveProviderNamespace(program)`.
2. Return `{}` if no namespace is marked with `@armProviderNamespace`.
3. Read registered ARM resource details from `listArmResources(program)`.
4. Resolve every registered ARM resource detail into one or more concrete resource-path records.
5. Post-process those records to attach `parent` and `scope`.
6. Add provider-level operations that are not ARM resource operations.
7. Return the completed `Provider`.

### Step 4: detecting concrete resources from ARM resource details

`listArmResources(program)` returns `ArmResourceDetails` records. Each record has this structure:

> Note: `ArmResourceDetails` is not really a resolved ARM resource detail. It is closer to an `ArmResourceModelDetails` record because it describes a registered TypeSpec resource model before operation paths are resolved into concrete ARM resource instances.

```ts
interface ArmResourceDetails {
  // The TypeSpec resource model name.
  name: string;

  // The resource model category inferred during registration.
  kind: ArmResourceKind;

  // The ARM provider namespace associated with the model.
  armProviderNamespace: string;

  // The key parameter name for the resource name segment, when known.
  keyName?: string;

  // The collection/type segment for this resource model, when known.
  collectionName?: string;

  // The TypeSpec model that declared the resource shape.
  typespecType: Model;

  // The operations currently associated with the model in the older resource-details API.
  operations: ArmResourceOperations;

  // A legacy resource type path derived from one representative operation path, when available.
  resourceTypePath?: string;
}
```

For each ARM resource detail returned by `listArmResources(program)`:

1. Treat the detail as a candidate resource model detail.
2. Find operations registered as `Read` and `CreateOrUpdate` for that resource.
3. Use each `Read` or `CreateOrUpdate` operation path as a candidate ARM resource instance path.
   - Do not re-check HTTP verb or response model in the resolver.
   - Protocol and response-model correctness should be handled by linters.
4. Validate and parse each candidate path as an ARM resource instance path.
5. Group candidate paths by normalized resource identity.
6. Create one concrete `ResolvedResource` record for each group.
   - If `Read` and `CreateOrUpdate` share the same normalized path, they produce one resource with both operations attached.
   - If they use different valid paths, they produce separate resources.
   - If only `CreateOrUpdate` exists, it still produces a resource.
7. Derive resource facts from the grouped instance path.
   - This includes `resourceInstancePath`, `resourceType`, `scope`, resource name parameter or singleton name, `providerNamespace`, parent candidate information, and the canonical grouping key.
   - These facts should come from the canonical instance path, not independently from each operation.
   - Singleton information should be path-based. If the resource name segment in the canonical path is a literal value, that value is the singleton key. If the name segment is a parameter with a closed set of literal values, those values are the singleton keys.
   - The canonical path is also what later steps use to attach remaining operations and resolve parent/scope relationships.
8. Append other lifecycle, list, and action operations to the detected resource.
   - Append lifecycle operations when the operation's normalized instance path matches the detected resource identity.
   - Append list operations when the operation's normalized collection or scope path is compatible with the detected resource identity.
   - Append action operations when the operation's normalized path is under the detected resource instance path or collection path.
   - Keep protocol correctness as linting, not detection. The expected HTTP verb for each lifecycle kind should be enforced by a linter, not by the resolver.
   - Operations that cannot be associated with any detected resource should remain available for the provider-level operation pass.
9. If a candidate model has neither `Read` nor `CreateOrUpdate`, it should not become a resolved resource. A linter or design-rule diagnostic can decide whether that is invalid.

#### Normalized resource identity comparison

Whenever the resolver compares resource paths or resource identities, it should use a normalized comparison:

1. Provider namespace is compared case-insensitively.
2. Resource type segments are compared case-insensitively.
3. Literal path segments are compared case-insensitively.
4. Variable path segments are compared by position only; the parameter name is ignored.
   - `{subscriptionId}` and `{subscription}` are equivalent.
   - `{resourceGroupName}` and `{rgName}` are equivalent.
5. Path structure must still match. A variable segment is not equivalent to a literal segment unless the design explicitly treats the literal as a singleton value.
6. The resolver should keep one canonical display path in the output, but use normalized identity for matching and grouping.

One ARM resource detail can produce more than one `ResolvedResource` when its `Read` or `CreateOrUpdate` operations resolve to different paths or scopes.

### Step 5: attaching parent and scope information

After all `ResolvedResource` records are created:

1. Find each resource's parent by comparing its resource type segments with the other resolved resources.
2. If a parent path is implied by the resource type but no matching resource exists, skip the parent instead of synthesizing an empty parent resource.
3. Determine the resource scope from the path prefix before the last `/providers` segment.
4. Use well-known scope names for tenant, subscription, resource group, management group, and generic scope paths.
5. For extension resources whose target is another concrete resource, attach a structured resource reference as the scope.
6. Let child resources inherit scope from their parent when appropriate.
