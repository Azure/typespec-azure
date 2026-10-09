---
title: "use-api-version"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/use-api-version
```

Validate that ARM Resource operations include an `api-version` parameter referencing `Azure.ResourceManager.CommonTypes.ApiVersionParameter`.

In ARM, it is important that the api-version parameter references the common-types `ApiVersionParameter` rather than a plain string parameter.

## Impact

- **Area:** API, SDK

An operation without the standard API version parameter cannot evolve safely and is difficult for SDKs to represent consistently.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ApiVersionParameterRequired](https://github.com/Azure/azure-openapi-validator/blob/main/docs/api-version-parameter-required.md).

#### ❌ Incorrect

Operations missing an api-version parameter:

```tsp
model MyResourceInstanceParameters<TResource extends {}> {
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;
  ...ProviderNamespace<TResource>;
  ...KeysOf<TResource>;
  // Note: no ApiVersionParameter spread here
}

@armResourceOperations
interface FooResources {
  @armResourceAction(FooResource)
  @action
  @post
  myFooAction(...MyResourceInstanceParameters<FooResource>):
    | ArmResponse<FooResource>
    | ErrorResponse;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface FooResources {
  // Using standard ARM resource operation templates automatically includes ApiVersionParameter
  get is ArmResourceRead<FooResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<FooResource>;
}
```

Or include `ApiVersionParameter` explicitly via `ResourceInstanceParameters`:

```tsp
@armResourceOperations
interface FooResources {
  @armResourceAction(FooResource)
  @action("myFooAction")
  @post
  myFooAction(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
}
```

Or spread `Azure.ResourceManager.ApiVersionParameter` directly in a custom parameters model. The `ApiVersionParameter` must be listed first, as ARM convention requires the api-version to be the first query parameter:

```tsp
model MyResourceInstanceParameters<TResource extends {}> {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;
  ...ProviderNamespace<TResource>;
  ...KeysOf<TResource>;
}

@armResourceOperations
interface FooResources {
  @armResourceAction(FooResource)
  @action("myFooAction")
  @post
  myFooAction(...MyResourceInstanceParameters<FooResource>):
    | ArmResponse<FooResource>
    | ErrorResponse;
}
```

## Suppression

Do not suppress unless it is a false positive. Use the common-types `ApiVersionParameter`.
