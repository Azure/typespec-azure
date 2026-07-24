This diagnostic is issued when TCGC skips loading examples because the examples directory cannot be read, an example file cannot be parsed, or required `operationId` or `title` metadata is missing.

## Impact

- **Area:** Example and sample loading. Generation continues without the affected example files, so generated samples or example-based tests may be incomplete.
- **Not affected:** SDK clients, models, and service protocol metadata are still generated from TypeSpec.

## Invalid example file

## Diagnostic Message

For the example file above, TCGC reports:

```text
Skipped loading invalid example file: get.json. Error: Unexpected token
```

## ✅ How to Fix

Fix the JSON syntax or contents of the example file so it can be parsed.

## Examples directory cannot be read

## Diagnostic Message

For the example directory above, TCGC reports:

```text
Skipping example loading from ./examples because there was an error reading the directory.
```

## ✅ How to Fix

Create the configured examples directory, correct the `examples-dir` option, or omit the option when examples are not available.

## Missing operationId or title

## Diagnostic Message

For the example file above, TCGC reports:

```text
Skipping example file get.json because it does not contain an operationId and/or title.
```

## ✅ How to Fix

Add both `operationId` and `title` to the example JSON file.

## Suppression

Suppress this warning only if examples are optional for this run, such as local validation where the examples directory is intentionally absent.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/example-loading" "examples not required for this run"
```
