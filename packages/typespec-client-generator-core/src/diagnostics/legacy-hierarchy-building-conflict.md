This diagnostic is issued when `@hierarchyBuilding` rebases a model hierarchy and a same-named property from the old base chain has a type that does not match the property supplied by the new base chain.

## Impact

- **Area:** Legacy SDK inheritance rebasing. Generation continues, but a conflicting same-named property is dropped from the generated rebased hierarchy.
- **Not affected:** The service schema still contains the original property definitions.

## ❌ Incorrect Usage

```typespec
model C {
  shared?: int32;
}

model OldBase {
  shared?: string; // conflicts with `C.shared` type `int32` after rebasing
}

@hierarchyBuilding(C)
model A extends OldBase {
  a?: string;
}

@route("/test")
op test(): A;
```

## Diagnostic Message

TCGC reports:

```text
@hierarchyBuilding decorator: property 'shared' on model 'A' has type that does not match the same-named property supplied by the new base chain (rooted at 'C'). The property is dropped from 'A' to satisfy the rebase rule (own properties are filtered against the new base chain by name). Consider aligning the types or removing the property from 'A'.
```

## ✅ How to Fix

Align the property types between the child and the new base chain, or remove the conflicting property from the child model.

```typespec
model C {
  shared?: int32;
}

model OldBase {
  shared?: int32;
}

@hierarchyBuilding(C)
model A extends OldBase {
  a?: string;
}

@route("/test")
op test(): A;
```

## Suppression

This diagnostic should not be suppressed. Fix the `@hierarchyBuilding` usage, or remove the decorator.
