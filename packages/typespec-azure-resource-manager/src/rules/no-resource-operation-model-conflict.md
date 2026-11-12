A resource operation must use the same resource model in every registration. Repeating a registration or overriding its logical resource grouping is allowed; changing the resource model is not. Model aliases refer to the same model, while distinct generic instantiations remain distinct models even if they share a declaration name.

The rule checks registrations on the original, unversioned type graph. Decorators replayed for selected API versions do not create additional source conflicts.

This warning is disabled in the central `resource-manager` ruleset. Enable it explicitly, or use the ARM library's `all` ruleset.

#### ❌ Incorrect

```typespec
model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model Gadget is TrackedResource<{}> {
  ...ResourceNameParameter<Gadget>;
}

interface Widgets {
  @armResourceRead(Gadget)
  read is ArmResourceRead<Widget>;
}
```

#### ✅ Correct

```typespec
model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

interface Widgets {
  @armResourceRead(Widget, "NamedWidgets")
  read is ArmResourceRead<Widget>;
}
```

The corrected example changes only the logical grouping. It does not change the associated model or operation kind. Changing an operation kind, for example combining `@armResourceRead` and `@armResourceUpdate`, produces the separate `arm-resource-operation-kind-conflict` error regardless of whether this rule is enabled.

## Impact

- **Emitters, Tooling:** Conflicting resource associations make Bicep and provisioning metadata ambiguous.

An operation registered against different resource models does not have a unique resource owner. Keep its registrations consistent instead of relying on decorator ordering to repair the association.

## Suppression

Suppression is not recommended. It hides the conflict but does not choose a resource owner or make generated metadata unambiguous. Remove the conflicting decorator or correct its model argument.

If an approved exception is unavoidable, place the directive above the operation:

```typespec
interface Widgets {
  #suppress "@azure-tools/typespec-azure-resource-manager/no-resource-operation-model-conflict" "Approved exception for this operation."
  @armResourceRead(Gadget)
  read is ArmResourceRead<Widget>;
}
```
