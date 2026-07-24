This diagnostic is issued when `@hierarchyBuilding` rebases a model hierarchy and a same-named property from the old base chain has a type that does not match the property supplied by the new base chain.

## Impact

- **Area:** Legacy SDK inheritance rebasing. Generation continues, but a conflicting same-named property is dropped from the generated rebased hierarchy.
- **Not affected:** The service schema still contains the original property definitions.

#### ❌ Incorrect Usage

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

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@hierarchyBuilding decorator: property 'shared' on model 'A' has type that does not match the same-named property supplied by the new base chain (rooted at 'C'). The property is dropped from 'A' to satisfy the rebase rule (own properties are filtered against the new base chain by name). Consider aligning the types or removing the property from 'A'.
```

#### ✅ How to Fix

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

Suppress this warning only if the property dropped during legacy hierarchy rebasing is intentional and generated SDK compatibility has been verified.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/legacy-hierarchy-building-conflict" "legacy rebase drops property intentionally"
```
