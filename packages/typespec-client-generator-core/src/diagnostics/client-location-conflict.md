This diagnostic is issued when a `@clientLocation` move conflicts with the client structure TCGC is building. It is reported in several situations:

- **String target with multiple root clients** — a string target cannot be resolved when more than one root client exists, because TCGC cannot decide which root client should own the new sub client.
- **Moving an operation onto another operation** — an operation can only be moved to an interface or namespace, not onto another operation.
- **Moving a model property to a string target** — a model property can only be moved to an interface or namespace, not to a string-named target.
- **Parameter name already used in client initialization** — the parameter produced by the moved model property collides with an existing client initialization parameter.
- **Same parameter moved with different types** — the same parameter name is moved to one client with conflicting types, which commonly happens when `@clientLocation` is applied to a templated parameter that is instantiated with different types.

## Impact

- **Area:** Client operation and parameter placement. Generation continues, but the requested `@clientLocation` move cannot be applied safely to the generated client structure.
- **Not affected:** HTTP routes, parameter wire names, and service operation definitions are unchanged.

### String target with multiple root clients

#### Diagnostic Message

For the client location above, TCGC reports:

```text
@clientLocation with string target could not be used for multiple root clients scenario
```

#### ✅ How to Fix

Use an interface or namespace target when multiple root clients exist, or define the target sub client explicitly under the intended root client.

### Operation to operation

#### Diagnostic Message

For the client location above, TCGC reports:

```text
`@clientLocation` cannot be used to move an operation to another operation. Operations can only be moved to interfaces or namespaces.
```

#### ✅ How to Fix

Move the operation to an interface or namespace instead of another operation.

### Model property conflicts with client initialization

#### Diagnostic Message

For the client location above, TCGC reports:

```text
There is already a parameter called 'apiKey' in the client initialization.
```

#### ✅ How to Fix

Rename one of the parameters or avoid moving the model property to a client that already has a client initialization parameter with that name.

### Model property moved to string target

#### Diagnostic Message

For the client location above, TCGC reports:

```text
`@clientLocation` can only move model properties to interfaces or namespaces.
```

#### ✅ How to Fix

Move the model property to a concrete interface or namespace target instead of a string-named target.

### Moved parameters with conflicting types

#### ❌ Incorrect Usage

```typespec
@service
namespace Default;

union FeatureOptInKeys {
  insights: "Insights.V1Preview",
  schedules: "Schedules.V1Preview",
}

alias WithPreviewHeader<T extends FeatureOptInKeys> = {
  @clientLocation(Default) // templated parameter moves different concrete types to the same client
  @header("x-preview-features")
  previewFeatures: T;
};

op getInsights(...WithPreviewHeader<FeatureOptInKeys.insights>): void;
op getSchedules(...WithPreviewHeader<FeatureOptInKeys.schedules>): void;
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@clientLocation cannot move multiple parameters named 'previewFeatures' with different types to the same client. This often happens when @clientLocation is applied to a templated parameter that is instantiated with different types. Move the parameter on each operation instead, so that it has a consistent type on the client.
```

#### ✅ How to Fix

Move the parameter on each operation instead of on the templated alias, or ensure every moved `previewFeatures` parameter has the same type.

## Suppression

Suppress this warning only if the conflicting `@clientLocation` is intentionally ignored or handled manually by the target emitter.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-location-conflict" "client location handled manually"
```
