This diagnostic is issued when a `@clientLocation` move conflicts with the client structure TCGC is building. It is reported in several situations:

- **String target with multiple root clients** — a string target cannot be resolved when more than one root client exists, because TCGC cannot decide which root client should own the new sub client.
- **Moving an operation onto another operation** — an operation can only be moved to an interface or namespace, not onto another operation.
- **Moving a model property to a string target** — a model property can only be moved to an interface or namespace, not to a string-named target.
- **Parameter name already used in client initialization** — the parameter produced by the moved model property collides with an existing client initialization parameter.
- **Same parameter moved with different types** — the same parameter name is moved to one client with conflicting types, which commonly happens when `@clientLocation` is applied to a templated parameter that is instantiated with different types.

To fix this issue, move operations and model properties only to interfaces or namespaces, use an interface or namespace target (not a string) when there are multiple root clients, avoid parameter names that collide with client initialization, and keep a moved parameter's type consistent across the operations that share it.

### Example

A templated parameter moved to the same client with different instantiations resolves to conflicting types; move the parameter on each operation so it keeps a consistent type instead:

```typespec
using Azure.ClientGenerator.Core;

@service
namespace Default;

union FeatureOptInKeys {
  insights: "Insights.V1Preview",
  schedules: "Schedules.V1Preview",
}

alias WithPreviewHeader<T extends FeatureOptInKeys> = {
  @clientLocation(Default)
  @header("x-preview-features")
  previewFeatures: T;
};

op getInsights(...WithPreviewHeader<FeatureOptInKeys.insights>): void;
op getSchedules(...WithPreviewHeader<FeatureOptInKeys.schedules>): void;
```
