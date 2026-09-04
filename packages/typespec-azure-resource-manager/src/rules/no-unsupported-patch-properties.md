ARM PATCH request bodies must not make resource identity, location, or provisioning state properties writable. A PATCH operation cannot change top-level `id`, `name`, `type`, or `location`, or `properties.provisioningState`.

Remove these properties from the PATCH body, mark identity and provisioning state properties with read-only visibility, and mark location as read-only and create-only.

## Impact

- **Area:** API

Writable system-managed properties let generated SDKs offer updates that the service cannot safely apply and violate the ARM RPC contract.

## ❌ Incorrect

```tsp
model WidgetPatch {
  id?: string;
  location?: string;
  properties?: WidgetPatchProperties;
}

model WidgetPatchProperties {
  provisioningState?: string;
}
```

## ✅ Correct

```tsp
model WidgetPatch {
  @visibility(Lifecycle.Read)
  id?: string;

  @visibility(Lifecycle.Read, Lifecycle.Create)
  location?: string;

  properties?: WidgetPatchProperties;
}

model WidgetPatchProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}
```

## LintDiff Equivalent

This rule corresponds to the Swagger validator rule [UnSupportedPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/un-supported-patch-properties.md).
