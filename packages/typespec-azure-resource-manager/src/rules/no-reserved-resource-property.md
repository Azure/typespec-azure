Reserved names are used by the ARM platform and common types; declaring them in RP-specific properties can conflict with standardized behavior.

This rule checks the immediate and inherited members of an ARM resource's properties model. TypeSpec property names are matched case-insensitively and are disallowed regardless of their type.

| Reserved name | Reason                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `billingData` | Reserved for platform billing integration.                                                                                |
| `systemData`  | Resource system metadata belongs in the resource envelope, alongside `id`, `name`, and `type`, not in the properties bag. |

Standard ARM resource templates already provide the envelope's `systemData`. The rule does not recursively inspect nested objects or embedded resource envelopes.

The following examples assume a standard ARM resource whose properties model is `WidgetProperties`.

## ❌ Incorrect

```tsp
model WidgetProperties {
  description?: string;
  billingData?: string;
  systemData?: {
    createdBy?: string;
  };
}
```

## ✅ Correct

```tsp
model WidgetProperties {
  description?: string;
  billingInfo?: string;
}
```

Keep system metadata in the resource envelope rather than moving it into another resource-specific setting. Moving a property in an already released API changes its contract and requires compatibility review.

## LintDiff Equivalent

This rule covers the direct ARM resource-properties-bag restriction from [SystemDataInPropertiesBag](https://github.com/Azure/azure-openapi-validator/blob/main/docs/system-data-in-properties-bag.md). It does not reproduce the Swagger linter's recursive search through arbitrary nested objects.
