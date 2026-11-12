A resource operation should use the same resource model and ARM operation kind in every registration. Repeating a registration or overriding its logical resource grouping is allowed. Model aliases refer to the same model, while distinct generic instantiations remain distinct models even if they share a declaration name.

Conflicting operation kinds produce a suppressible warning, not a compilation error. The latest decorator execution determines the registered operation kind and grouping. Decorators on an operation execute from bottom to top, after inherited template decorators.

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

The corrected example changes only the logical grouping. It does not change the associated model or operation kind.

Resource actions can use `@get` and `@list` for read-only, paged responses without being registered as ARM resource lists. Do not add `@armResourceList` to such an action:

#### ❌ Incorrect

```typespec
model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

interface Widgets {
  @get
  @list
  @armResourceList(Widget)
  listRelated is ArmResourceActionSync<Widget, void, ResourceListResult<Widget>>;
}
```

The explicit resource-list registration executes after the inherited action registration and wins, but the inconsistent ARM operation kinds produce a warning.

#### ✅ Correct

```typespec
model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

interface Widgets {
  @get
  @list
  listRelated is ArmResourceActionSync<Widget, void, ResourceListResult<Widget>>;
}
```

This operation remains an ARM resource action. `@get` selects the HTTP verb, and `@list` supplies paging semantics; neither changes the ARM operation kind.

## Impact

- **Emitters, Tooling:** Conflicting resource models make ownership ambiguous, and changing operation kinds can misclassify actions as resource lists or lifecycle operations.

An operation registered against different resource models does not have a unique resource owner. Keep its registrations consistent instead of relying on decorator ordering to repair the association.

## Suppression

Suppression is acceptable for an approved, intentional operation-kind override when the latest registration is the desired result. Prefer removing a redundant or conflicting ARM decorator. Adding `@get` or `@list` to an action does not require suppression.

Suppressing a resource-model conflict is not recommended: it does not choose a resource owner or make generated metadata unambiguous. Correct the model argument instead.

If an approved exception is unavoidable, place the directive above the operation:

```typespec
interface Widgets {
  #suppress "@azure-tools/typespec-azure-resource-manager/no-resource-operation-conflict" "Preserve the intentional resource-list override."
  @get
  @list
  @armResourceList(Widget)
  listRelated is ArmResourceActionSync<Widget, void, ResourceListResult<Widget>>;
}
```
