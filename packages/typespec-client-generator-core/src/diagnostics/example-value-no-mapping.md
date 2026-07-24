This diagnostic is issued when a value from an example file cannot be matched to the TypeSpec definition.

## Impact

- **Area:** Example value conversion. Generation continues, but the mismatched example value is not mapped into SDK example data for the operation.
- **Not affected:** The operation signature and generated client method are unchanged.

## ❌ Incorrect Usage

```typespec
@service
namespace TestClient {
  @route("/{b}")
  op parametersDiagnostic(
    // example file provides unmapped parameter `test` for this operation
    @header a: string,

    @path b: string,
    @query c: string,
    @body d: string,
  ): void;
}
```

## Diagnostic Message

For the declaration above, TCGC reports:

```text
Value in example file 'parametersDiagnostic.json' does not follow its definition:
{"test":"a"}
```

## ✅ How to Fix

Update the example value or the TypeSpec definition so parameters, request bodies, and responses follow the declared shapes.

```typespec
@service
namespace TestClient {
  @route("/{b}")
  op parametersDiagnostic(
    @header a: string,
    @path b: string,
    @query c: string,
    @query test: string,
    @body d: string,
  ): void;
}
```

## Suppression

Suppress this warning only if the mismatched example value is intentionally excluded from generated SDK examples or tests.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/example-value-no-mapping" "example value intentionally not mapped"
```
