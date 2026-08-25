This diagnostic is issued when a decorator's typed options bag (e.g. `ClientOptions.scope` on
`@client`) and its legacy positional `scope` argument both specify a scope, but the two values
disagree.

## Impact

- **Area:** Scoped decorator resolution. TCGC cannot determine which scope value should take
  effect, so the decorator is not applied at all until the conflict is resolved.
- **Not affected:** Decorators that only specify a scope through one of the two mechanisms are
  unaffected.

## ❌ Incorrect Usage

```typespec
@client(
  {
    service: MyService,
    scope: "csharp",
  },
  "python"
)
interface MyInterface {}
```

## Diagnostic Message

TCGC reports:

```text
@client received conflicting scope values: the options bag specifies "csharp" while the legacy positional argument specifies "python". Use a single, consistent scope value.
```

## ✅ How to Fix

Specify the scope in only one place, or make sure both agree:

```typespec
@client({
  service: MyService,
  scope: "csharp",
})
interface MyInterface {}
```

```typespec
@client(
  {
    service: MyService,
  },
  "csharp"
)
interface MyInterface {}
```
