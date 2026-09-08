This diagnostic is issued when a decorator's typed options bag (e.g. `ClientOptions.scope` on
`@client`) and its legacy positional `scope` argument both specify a scope, but the two values
disagree.

## Impact

- **Area:** Scoped decorator resolution. TCGC uses the value specified in the options bag and
  ignores the legacy positional argument.
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
@client received conflicting scope values: the options bag specifies "csharp" while the legacy positional argument specifies "python". The options bag value will be used; the legacy positional argument is ignored.
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
