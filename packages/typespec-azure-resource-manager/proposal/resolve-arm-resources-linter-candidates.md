# Linter candidates for `resolveArmResources`

## Why these linters are needed

The proposed `resolveArmResources` design should use registered ARM operation kinds as the source of truth for resource detection. In particular, `Read` and `CreateOrUpdate` operations should define candidate resource instance paths.

That design is simpler and more stable than re-inferring operation meaning from HTTP verb and response shape during resource detection. However, it requires the TypeSpec program to be internally consistent: if an operation is registered as a resource `Read`, it must actually behave like a resource read operation; if it is registered as `CreateOrUpdate`, it must actually behave like a resource create-or-update operation.

These consistency checks should be enforced by linters rather than by `resolveArmResources` itself. Resource resolution should focus on building the resource graph. Linters should tell spec authors when an operation is mislabeled or malformed.

## Candidate: resource read operation shape

A resource `Read` operation should satisfy the resource-read contract:

```ts
@armResourceRead(ResourceModel)
op get(...): ResourceModel;
```

Expected checks:

1. The operation must use HTTP `GET`.
2. The operation must return the candidate resource model.
3. The operation path must be a valid ARM resource instance path.

Without this linter, `resolveArmResources` would need to defensively verify every registered `Read` operation before trusting its path. That would mix validation logic into the resolver and make the resolver less deterministic.

## Candidate: resource create-or-update operation shape

A resource `CreateOrUpdate` operation should satisfy the resource create-or-update contract:

```ts
@armResourceCreateOrUpdate(ResourceModel)
op createOrUpdate(...): ResourceModel;
```

Expected checks:

1. The operation must use HTTP `PUT`.
2. The operation must target the candidate resource model.
3. The operation path must be a valid ARM resource instance path.

This is important because the proposed resolver can use `CreateOrUpdate` as a resource identity source when a resource has no `Read`. If this operation is malformed, the resolver may detect a resource at the wrong path or attach later operations to the wrong resource.

## Candidate: lifecycle operation HTTP verb consistency

Every registered lifecycle operation kind should use the expected HTTP verb:

| Lifecycle kind   | Expected HTTP verb |
| ---------------- | ------------------ |
| `read`           | `GET`              |
| `createOrUpdate` | `PUT`              |
| `update`         | `PATCH`            |
| `delete`         | `DELETE`           |
| `checkExistence` | `HEAD`             |

This lets `resolveArmResources` attach lifecycle operations by their registered ARM operation kind without re-validating protocol shape during resource graph construction.

## Candidate: resource list response shape

A registered resource `List` operation should return a collection model whose item type is the candidate resource model.

Expected checks:

1. The operation must return a model that represents a collection or pageable collection.
2. The collection item type must be the resource model that the list operation is registered against.
3. The operation path should be compatible with the resource's collection path, parent path, or scope path.

This lets `resolveArmResources` attach list operations by registered ARM operation kind and path compatibility without re-inspecting response shape during resource graph construction.

## Design principle

`resolveArmResources` should trust the semantic operation kind recorded by ARM templates and decorators. The linter layer should ensure that the semantic kind agrees with the HTTP protocol shape and resource model shape.

This separation gives us:

- clearer diagnostics for spec authors
- simpler resource-resolution logic
- one place to validate ARM operation correctness
- a version-aware resolver that can focus on graph construction rather than protocol validation
