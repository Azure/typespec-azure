This diagnostic is issued when an `@override` operation does not preserve required parameters from the original operation, or a realized path parameter loses its `@path` role.

## Impact

- **Area:** Client method override signatures. Blocks an override that cannot be mapped back to the original service operation's required parameters.
- **Not affected:** The original operation remains available with its declared parameters.

#### ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  op create(name: string, location: string): void;
}

op createOverride(name: string): void;
@@override(MyService.create, createOverride);
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Method "create" has different parameters definition from the override operation. Please check the parameter defined in the override operation: "location".
```

#### ✅ How to Fix

Update the override operation so required parameters are present with compatible definitions and path parameters remain path parameters unless intentionally moved with `@clientLocation`:

```typespec
op createOverride(name: string, location: string): void;
@@override(MyService.create, createOverride);
```
