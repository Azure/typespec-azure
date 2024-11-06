---
title: My enums are not extensible anymore
---

## Symptoms

I had an enum that used to generate `x-ms-enum.modelAsString: true` but now it is generating as `x-ms-enum.modelAsString: false` and I see a warning message `@azure-tools/typespec-azure-core/no-enum`

## Cause

Azure stopped treating enums as extensible.

## Workaround

To define an extensible enum you will need instead to use a `union` where one of the variants is `string`.
If you see the linter warning [`@azure-tools/typespec-azure-core/no-enum`](https://tspwebsitepr.z22.web.core.windows.net/typespec-azure/prs/389/docs/next/libraries/azure-core/rules/no-enum) it also offers an automatic codefix (click the (ℹ) bulb in VS Code)
For example

```tsp
enum PetKind {
  Cat,
  Dog,
}
```

should be converted to

```tsp
union PetKind {
  Cat: "Cat",
  Dog: "Dog",
  string,
}
```
