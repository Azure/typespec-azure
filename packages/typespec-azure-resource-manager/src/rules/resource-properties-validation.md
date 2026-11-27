ARM resource models must define read-only `name`, `id`, and `type` properties. When a resource defines `tags`, its values must be strings.

## Impact

- **Area:** API, SDK

Missing or writable resource identity properties violate ARM guidelines. Non-string tag values do not conform to the Azure resource tags schema and can prevent SDK generation.

## ❌ Incorrect

### Resource identity properties are writable

Assume `Widget` is an ARM resource. Its `id` and `type` properties must be read-only in the resource hierarchy:

```typespec
model Widget is TrackedResource<{}> {
  @visibility(Lifecycle.Read, Lifecycle.Create)
  id?: Azure.Core.armResourceIdentifier;
}
```

### Tags use non-string values

```typespec
tags?: Record<int32>;
```

## ✅ Correct

### Resource identity properties are read-only

Use the standard ARM resource base types, which provide read-only `name`, `id`, and `type` properties:

```typespec
model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}
```

### Tags use string values

```typespec
tags?: Record<string>;
```

## Suppression

Fix the resource model to follow the ARM resource property and tags requirements.

## LintDiff Equivalent

This rule combines [RequiredPropertiesMissingInResourceModel](https://github.com/Azure/azure-openapi-validator/blob/main/docs/required-properties-missing-in-resource-model.md) and [AzureResourceTagsSchema](https://github.com/Azure/azure-openapi-validator/blob/main/docs/azure-resource-tags-schema.md).
