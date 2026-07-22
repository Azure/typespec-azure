This diagnostic is issued when the value passed to the `@usage` decorator is not one of the supported usage flags.

To fix this issue, pass one or more of `Usage.input`, `Usage.output`, `Usage.json`, or `Usage.xml` to `@usage`, and remove custom or empty usage values.

### Example

Instead of:

```typespec
enum CustomUsage {
  custom: 8,
}
@usage(CustomUsage.custom)
model Widget {}
```

Use:

```typespec
@usage(Usage.input | Usage.json)
model Widget {}
```
