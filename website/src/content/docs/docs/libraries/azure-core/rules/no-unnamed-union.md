---
title: "no-unnamed-union"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-unnamed-union
```

Inline union expressions (using the `|` operator) should not be used in Azure service specifications. Instead, unions must be defined as named types.

## Rationale

Many target languages cannot represent inline union types directly and require them to be named types. By requiring named unions in the specification, we ensure:

- **Consistent code generation**: Generated SDKs in languages like C#, Java, and Python can properly represent the union as a named type
- **Better documentation**: Named unions provide clear type names that appear in generated documentation
- **Improved maintainability**: Named unions are easier to reuse across multiple properties and operations

## Examples

#### ❌ Incorrect

Using inline union expressions:

```tsp
model Request {
  approvalStatus: "Approved" | "Rejected" | string;
}

model Response {
  status: "Success" | "Failure";
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

:::note
Enums are also discouraged, see [no-enum rule](./no-enum.md) for more details.
:::

```tsp
model Response {
  status: ResponseStatus;
}

enum ResponseStatus {
  Success: "Success",
  Failure: "Failure",
}
```
