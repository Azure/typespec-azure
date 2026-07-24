This diagnostic is issued when TCGC converts a union that directly or indirectly contains itself. Recursive union shapes cannot be represented safely as generated SDK union types.

## Impact

- **Area:** SDK union type conversion. Generation continues with a fallback union shape, but the recursive union cannot become a usable SDK union.
- **Not affected:** The TypeSpec union declaration is still accepted by the compiler.

## ❌ Incorrect Usage

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

## Diagnostic Message

TCGC reports:

```text
Cannot have a union containing self.
```

## ✅ How to Fix

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

This diagnostic should not be suppressed. Fix the spec to break the circular union reference, or model the recursion through a model property instead.
