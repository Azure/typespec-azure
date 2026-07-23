This diagnostic is issued when the value passed to the `@usage` decorator is not one of the supported usage flags.

## Impact

- **Area:** SDK model usage overrides. Blocks unsupported explicit usage flags from being added to generated model, enum, or union metadata.
- **Not affected:** Usage inferred from actual operation inputs and outputs is still calculated separately.

#### ❌ Incorrect Usage

```typespec
enum CustomUsage {
  custom: 8,
}
@usage(CustomUsage.custom) // ❌ `8` is not a supported Usage flag
model Widget {}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Usage value must be one of: 2 (input), 4 (output), 256 (json), or 512 (xml).
```

#### ✅ How to Fix

Pass one or more of `Usage.input`, `Usage.output`, `Usage.json`, or `Usage.xml` to `@usage`, and remove custom or empty usage values:

```typespec
@usage(Usage.input | Usage.json)
model Widget {}
```
