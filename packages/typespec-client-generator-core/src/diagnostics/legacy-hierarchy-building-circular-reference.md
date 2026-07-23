This diagnostic is issued when `@hierarchyBuilding` creates a recursive base-type chain.

## Impact

- **Area:** Legacy SDK inheritance rebasing. Blocks hierarchy rebasing because it would create a circular generated base-model chain.
- **Not affected:** The original TypeSpec inheritance declarations are unchanged.

#### ❌ Incorrect Usage

```typespec
@usage(Usage.input)
namespace TestService;

model A extends B {
  propA: string;
}

@hierarchyBuilding(A) // rebasing `B` onto `A` creates a circular base chain
model B extends C {
  propB: string;
}

model C {
  propC: string;
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@hierarchyBuilding decorator causes recursive base type reference.
```

#### ✅ How to Fix

Remove or change the `@hierarchyBuilding` decorator so the rebased hierarchy is acyclic.
