This diagnostic is issued when TCGC skips loading examples because the examples directory cannot be read, an example file cannot be parsed, or required `operationId` or `title` metadata is missing.

## Impact

- **Area:** Example and sample loading. Generation continues without the affected example files, so generated samples or example-based tests may be incomplete.
- **Not affected:** SDK clients, models, and service protocol metadata are still generated from TypeSpec.

## Invalid example file

### Diagnostic Message

TCGC reports:

```text
Skipped loading invalid example file: get.json. Error: Unexpected token
```

### ✅ How to Fix

Fix the JSON syntax or contents of the example file so it can be parsed.

## Examples directory cannot be read

### Diagnostic Message

TCGC reports:

```text
Skipping example loading from ./examples because there was an error reading the directory.
```

### ✅ How to Fix

Create the configured examples directory, correct the `examples-dir` option, or omit the option when examples are not available.

## Missing operationId or title

### Diagnostic Message

TCGC reports:

```text
Skipping example file get.json because it does not contain an operationId and/or title.
```

### ✅ How to Fix

Add both `operationId` and `title` to the example JSON file.

## Suppression

This diagnostic should not be suppressed. Fix the example directory/files so they can be loaded, including valid JSON with `operationId` and `title`.
