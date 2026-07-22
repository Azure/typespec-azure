This diagnostic is issued when TCGC converts a union that directly or indirectly contains itself. Recursive union shapes cannot be represented safely as generated SDK union types.

To fix this issue, break the circular union reference or model the recursive relationship through a model property instead.

### Example

```typespec
@service
namespace Test {
  union Test {
    null,
    Test,
  }

  op test(test: Test): void;
}
```

The union `Test` contains itself, so break the circular reference or model the recursion through a model property instead.
