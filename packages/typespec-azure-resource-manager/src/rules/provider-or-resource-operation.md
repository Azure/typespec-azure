Every concrete ARM operation must be registered as either a provider operation or an operation on a registered resource model. Matching an ARM route or returning a resource model is not sufficient.

Prefer standard operation templates. They register the operation automatically, including provider actions, resource lifecycle operations, and extension resource operations. For a custom provider operation that cannot use a standard template, apply `@providerOperation`. For custom resource operations, apply the appropriate resource operation decorator, such as `@armResourceRead(Widget)`, using a registered resource model.

The diagnostic distinguishes three registration problems:

- If an operation is outside an interface and is not marked with `@providerOperation` or `@armResourceCollectionAction`, it reports `Resource operations must be defined inside an interface`. Enclose resource operations in an interface so their resource operation decorators can register them. Collection actions are excluded from this interface-specific message, but still need valid provider or resource operation registration.
- If the operation has no provider or resource operation registration, it recommends standard operation templates or the appropriate operation decorator.
- If the operation has a resource operation registration but its resource model is not registered, it names that model: `The resource "Widget" for this operation is not a registered ARM resource. Use standard resource templates to create resources.` Declare the resource using a standard template such as `TrackedResource`, `ProxyResource`, or `ExtensionResource`, including its `ResourceNameParameter`. For built-in resources, use the registered wrapper template, such as `PrivateEndpointConnectionResource`.

#### ❌ Incorrect

```typespec
@armResourceOperations
interface Widgets {
  @get
  get(...ResourceInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;
}
```

#### ✅ Correct

```typespec
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}

interface ProviderActions {
  refresh is ArmProviderActionSync;
}

// Extra is a registered ExtensionResource.
@armResourceOperations
interface Extras {
  get is Extension.Read<Extension.Subscription, Extra>;
}
```

### Resource operation outside an interface

Even when `Widget` is a registered resource and the operation uses a standard resource operation template, a standalone resource operation cannot be registered.

#### ❌ Incorrect

```typespec
model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@action("restart")
op restart is ArmResourceActionSync<Widget, void, Widget>;
```

#### ✅ Correct

```typespec
model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  @action("restart")
  restart is ArmResourceActionSync<Widget, void, Widget>;
}
```

## Impact

- **Bicep, Provisioning library:** Resource operations must be properly registered for downstream generators.

Bicep templates and the provisioning library require all resource operations to be registered against their resource models. Missing registrations result in invalid Bicep templates and an invalid provisioning library for the service. Marking a resource operation as a provider operation does not fix the missing resource registration.

## Suppression

Suppression is not recommended: it hides missing metadata required by downstream generators. Prefer standard templates, register custom resource operations with the appropriate decorator, or use `@providerOperation` for a genuine provider operation.

If a suppression is necessary for an approved exception, place the directive above the operation:

```typespec
interface CustomOperations {
  #suppress "@azure-tools/typespec-azure-resource-manager/provider-or-resource-operation" "Approved exception for this operation."
  @get
  custom(): string;
}
```
