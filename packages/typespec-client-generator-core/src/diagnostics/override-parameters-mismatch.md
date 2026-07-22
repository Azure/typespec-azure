This diagnostic is issued when an `@override` operation does not preserve required parameters from the original operation, or a realized path parameter loses its `@path` role.

To fix this issue, update the override operation so required parameters are present with compatible definitions and path parameters remain path parameters unless intentionally moved with `@clientLocation`.

### Example

Instead of omitting a required original parameter:

```typespec
@service
namespace MyService {
  op create(name: string, location: string): void;
}

op createOverride(name: string): void;
@@override(MyService.create, createOverride);
```

Include the required parameter in the override:

```typespec
op createOverride(name: string, location: string): void;
@@override(MyService.create, createOverride);
```
