This diagnostic is issued when TCGC converts a union that directly or indirectly contains itself. Recursive union shapes cannot be represented safely as generated SDK union types.

## Impact

- **Area:** SDK union type conversion. Generation continues with a fallback union shape, but the recursive union cannot become a usable SDK union.
- **Not affected:** The TypeSpec union declaration is still accepted by the compiler.

#### ❌ Incorrect Usage

```typespec
@service
namespace Test {
  union Test {
    null,
    Test, // union contains itself
  }

  op test(test: Test): void;
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Cannot have a union containing self.
```

#### ✅ How to Fix

Break the circular union reference or model the recursive relationship through a model property instead.

```typespec
@service
namespace Test {
  union Test {
    null,
    string,
  }

  op test(test: Test): void;
}
```

## Suppression

Suppress this warning only if the recursive union is intentionally left in the source and you accept that TCGC cannot produce a usable SDK union for it.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/union-circular" "recursive union intentionally ignored by SDK"
```
