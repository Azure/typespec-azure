---
title: Getting Resource Information from ARM Specs
---

Emitter authors can use `resolveArmResources` from
`@azure-tools/typespec-azure-resource-manager` to get a provider-wide view of the resources and
operations declared by an ARM TypeSpec service.

The resolved metadata includes:

- each concrete ARM resource occurrence and its TypeSpec model;
- tracked or proxy presentation kind;
- ARM resource type and instance path;
- lifecycle, list, action, and associated operations;
- parent and resource-valued scope relationships;
- singleton information; and
- provider-level operations that are not associated with a resource.

## Resolve the provider view

Pass the emitter's compiled `Program` to `resolveArmResources`:

```ts
import { resolveArmResources } from "@azure-tools/typespec-azure-resource-manager";

const provider = resolveArmResources(context.program);

for (const resource of provider.resources ?? []) {
  console.log(resource.resourceName);
  console.log(resource.kind); // "Tracked" or "Proxy"
  console.log(resource.resourceType);
  console.log(resource.resourceInstancePath);
}
```

With no options, the resolver returns the service's declaration view. For a versioned service,
this is the multi-version view and is not limited to one API version.

Each `ResolvedResource` represents one concrete resource instance path. The same TypeSpec model can
therefore appear in more than one resolved resource when it is used at multiple scopes, parent
paths, or extension targets.

## Read resource operations

Operations are grouped by how they relate to a resource:

```ts
for (const resource of provider.resources ?? []) {
  const lifecycle = resource.operations.lifecycle;

  for (const operation of lifecycle.read ?? []) {
    console.log("read", operation.operationGroup, operation.name);
  }

  for (const operation of lifecycle.createOrUpdate ?? []) {
    console.log("create or update", operation.operationGroup, operation.name);
  }

  for (const operation of resource.operations.lists) {
    console.log("list", operation.operationGroup, operation.name);
  }

  for (const operation of resource.operations.actions) {
    console.log("action", operation.operationGroup, operation.name);
  }
}
```

`resource.parent` and a resource-valued `resource.scope` point to objects in the same returned
resource graph. Compare object identity or stable ARM identity fields rather than resolving those
relationships again.

Provider operations are available separately:

```ts
for (const operation of provider.providerOperations ?? []) {
  console.log(operation.operationGroup, operation.name);
}
```

## Resolve one API version

Pass the exact value of a member in the service's `@versioned` enum:

```ts
const provider = resolveArmResources(context.program, {
  version: "2025-01-01",
});
```

The selected result contains only declarations available in that version. Returned TypeSpec
models, operations, properties, and HTTP metadata come from the projected version graph, so they
also reflect versioned renames, type changes, optionality changes, and return-type changes.

An unknown version or a version supplied for a transiently versioned service reports a diagnostic
and returns an empty provider result.

Reuse the same compiled `Program` when resolving several versions:

```ts
const v1 = resolveArmResources(context.program, { version: "2024-01-01" });
const v2 = resolveArmResources(context.program, { version: "2025-01-01" });
```

The resolver isolates and caches the projected structural graphs. Resolving one version does not
change another version or the default declaration view.

## Resolve the latest version of multiple services

Some programs contain several ARM services that share one ARM provider string but declare separate
version enums. For example, Compute, ComputeDisk, ComputeGallery, and ComputeSku all use
`Microsoft.Compute`. Select these services by their TypeSpec namespace objects, not by the shared
ARM provider string.

Use the compiler and versioning APIs to discover each ARM service and its latest declared version:

```ts
import { getNamespaceFullName, listServices } from "@typespec/compiler";
import { getAllVersions } from "@typespec/versioning";
import {
  getArmProviderNamespace,
  resolveArmResources,
  type ArmServiceVersionSelection,
} from "@azure-tools/typespec-azure-resource-manager";

const serviceVersions: ArmServiceVersionSelection[] = listServices(context.program)
  .filter(
    ({ type: namespace }) => getArmProviderNamespace(context.program, namespace) !== undefined,
  )
  .map(({ type: namespace }) => {
    const version = getAllVersions(context.program, namespace)?.at(-1);
    if (version === undefined) {
      throw new Error(
        `ARM service ${getNamespaceFullName(namespace)} does not declare service versions.`,
      );
    }
    return { namespace, version };
  });

const provider = resolveArmResources(context.program, { serviceVersions });
```

`getAllVersions` returns versions in enum declaration order, so `.at(-1)` selects the latest
declared version. If an emitter uses another policy, such as latest stable, apply that policy to the
returned `Version[]` before creating the selection.

The resolver projects every selected namespace at its own version and returns one combined
`Provider`. A selection is atomic: if any namespace/version pair is invalid, the call reports a
diagnostic and returns an empty provider result.

If emitter configuration supplies strings, resolve them against the discovered objects before
calling the resolver:

```ts
const namespace = listServices(context.program)
  .map((service) => service.type)
  .find((candidate) => getNamespaceFullName(candidate) === configuredNamespace);

if (namespace === undefined) {
  throw new Error(`Service namespace ${configuredNamespace} was not found.`);
}

const version = getAllVersions(context.program, namespace)?.find(
  (candidate) => candidate.value === configuredVersion,
);
if (version === undefined) {
  throw new Error(`Version ${configuredVersion} was not found for ${configuredNamespace}.`);
}

const provider = resolveArmResources(context.program, {
  serviceVersions: [{ namespace, version }],
});
```

The `version` and `serviceVersions` options are mutually exclusive in TypeScript. Use `version` for
the existing single-service string-based call and `serviceVersions` for reference-based
multi-service selection.

## Apply TCGC client names

An SDK emitter can reuse its TCGC `SdkContext` so `@clientName` and language-scoped naming rules are
applied to the logical ARM metadata:

```ts
import { resolveArmResources } from "@azure-tools/typespec-azure-resource-manager";
import { createSdkContext, getLibraryName } from "@azure-tools/typespec-client-generator-core";

const sdkContext = await createSdkContext(context, "@azure-tools/my-emitter");

const provider = resolveArmResources(context.program, {
  version: "2025-01-01",
  nameResolver: ({ kind, type }) =>
    kind === "resource" || type === undefined ? undefined : getLibraryName(sdkContext, type),
});
```

If the emitter already created an `SdkContext`, reuse it rather than creating another one.

The resolver invokes the callback for these logical metadata kinds:

| Kind              | Type passed to the callback | What the result names                          |
| ----------------- | --------------------------- | ---------------------------------------------- |
| `resource-model`  | `Model`                     | One model operand in a derived resource name   |
| `resource`        | `Model` or `undefined`      | The complete resolved resource occurrence name |
| `operation`       | `Operation`                 | The logical operation name                     |
| `operation-group` | `Interface`                 | The logical operation-group name               |

The example returns `undefined` for the complete `resource` phase. This lets the resolver compose
the final resource name from every TCGC-renamed model operand while preserving explicit resource
names. It also avoids treating the model reused by an internally synthesized resource as its
authoritative declaration.

The complete `resource` phase has final precedence. Use it when an emitter needs a name for one
specific resource occurrence:

```ts
const provider = resolveArmResources(context.program, {
  version: "2025-01-01",
  nameResolver: (request) => {
    if (
      request.kind === "resource" &&
      request.resourceInstancePath ===
        "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/employees/{employeeName}"
    ) {
      return "SubscriptionEmployee";
    }

    return request.kind === "resource" || request.type === undefined
      ? undefined
      : getLibraryName(sdkContext, request.type);
  },
});
```

Use `resourceInstancePath` when one model or ARM resource type appears at multiple scopes or parent
paths. The path preserves the TypeSpec HTTP parameter names, such as `{subscriptionId}`.

## Logical names do not change wire metadata

The naming callback changes consumer-facing logical metadata only:

- `ResolvedResource.resourceName`;
- `ArmResourceOperation.name`; and
- `ArmResourceOperation.operationGroup`.

It does not change:

- the provider namespace;
- ARM resource type segments;
- `resourceInstancePath`;
- HTTP paths or methods;
- serialized names;
- parent or scope identity; or
- singleton keys.

Return `undefined` to keep the resolver's default name. Returning an empty string reports a
diagnostic and preserves the default.

## Cache and result guidance

- The no-options declaration result can be cached by the resolver.
- Customized naming results are copied from structural metadata and are not shared between calls.
- Do not mutate returned resource or operation metadata for another consumer.
- Use `resourceType` and `resourceInstancePath` for ARM identity; use `resourceName` for the
  consumer-facing logical name.
