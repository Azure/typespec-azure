TCGC decorators use language scopes to select which generated SDKs receive a customization. Azure SDK specs support these language identifiers: `csharp`, `go`, `java`, `javascript`, and `python`. This rule reports any other identifier instead of allowing a typo or unsupported language to be silently ignored.

Scopes may be a single identifier, a comma-separated list, or a negation pattern. The options-bag form is also supported.

#### ❌ Incorrect

```tsp
@alternateType(string, "typescript")
scalar Timestamp extends utcDateTime;
```

#### ✅ Correct

```tsp
@alternateType(string, "javascript")
scalar Timestamp extends utcDateTime;
```

For example, `"python, java"` and `"!(go, csharp)"` are also valid scopes. The same identifiers may be provided through a decorator options bag, such as `#{ scope: "javascript" }`.

## Impact

- **Area:** SDK, Emitters

An unsupported scope causes the TCGC decorator customization to be ignored by Azure SDK emitters. This can result in generated SDK APIs differing from the author’s intent.

## Suppression

Suppressing this rule is not recommended. Replace the scope with a supported Azure SDK language identifier; for TypeScript SDKs, use `"javascript"`. If suppression is unavoidable, place a `#suppress "@azure-tools/typespec-client-generator-core/valid-tcgc-scopes" "<justification>"` directive above the decorated declaration.
