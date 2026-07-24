Azure services should not define anonymous models, union expressions, enum expressions, or scalar expressions inline. Instead, types must be defined as named declarations.

## Impact

- **Area:** SDK, API

Anonymous inline types - models, unions, enums, or scalars - cannot be represented directly by many target languages, forcing awkward or unusable SDK types.

## Rationale

Many target languages cannot represent inline union types or anonymous models directly and require them to be named types. By requiring named types in the specification, we ensure:

- **Consistent code generation**: Generated SDKs in languages like C#, Java, and Python can properly represent the type as a named type
- **Better documentation**: Named types provide clear type names that appear in generated documentation
- **Improved maintainability**: Named types are easier to reuse across multiple properties and operations

## Examples

#### ❌ Incorrect

Using inline union expressions:

```tsp
model Request {
  approvalStatus: "Approved" | "Rejected" | string;
}
```

Using anonymous inline models:

```tsp
model Outer {
  nested: {
    foo: string;
  };
}
```

#### ✅ Correct

Define unions as named types:

```tsp
model Request {
  approvalStatus: RequestApprovalStatus;
}

union RequestApprovalStatus {
  Approved: "Approved",
  Rejected: "Rejected",
  string,
}
```

Define models as named types:

```tsp
model Nested {
  foo: string;
}

model Outer {
  nested: Nested;
}
```

:::note
Enums are also discouraged, see [no-enum rule](./no-enum.md) for more details.
:::

## Exceptions

The following patterns are **not** flagged:

- Nullable unions (e.g. `MyModel | null`)
- Status code unions (e.g. `@statusCode _: 200 | 400`)
- Content-type header unions (e.g. `@header contentType: "application/json" | "text/plain"`)
- HTTP response envelope models (containing `@statusCode`, `@body`, `@header`, etc.)
- Types defined inside standard library namespaces (`TypeSpec.*`, `Azure.*`)
- Unions where all non-null variants are scalars (e.g. `string | int32`)

## Suppression

Suppress only when required to match an existing API; otherwise define the type as a named declaration.
