---
applyTo: "packages/typespec-client-generator-core/**/*"
---

# @azure-tools/typespec-client-generator-core Development

These notes supplement the repo-level `.github/copilot-instructions.md` with conventions specific to TCGC. Reviewers regularly ask for code that reimplements existing TCGC mechanisms to be removed, so reuse what is already here.

## Decorators and scopes

- Store and read scoped decorator data with `setScopedDecoratorData` / `getScopedDecoratorData`, like the other TCGC decorators. Don't add `useStateMap`, a custom scope parser, a declaration array or new scope-resolution logic.
- Let standard scope precedence handle repeated or overlapping declarations instead of adding a decorator-specific duplicate diagnostic.

## State and caching

- Put caches and per-run state on `TCGCContext`, next to the existing caches. Don't add module-level or multi-layer caches.
- Resolve decorator data in the existing pass that already handles the relevant type (for example while processing an LRO response model) rather than adding another iteration over methods or properties.

## Diagnostics

- Don't add a feature-specific diagnostic when a shared validation already covers the case (for example `duplicate-client-name` for naming conflicts). If the shared check misses a case, extend it.
- Use compiler helpers such as `walkPropertiesInherited` instead of hand-written inheritance walks.
- Diagnostic docs follow the format of the existing diagnostic docs.

## Before committing

- Review the diff and ask, for each new function, type or diagnostic: does TCGC or the compiler already provide this? If you're unsure, say so in the PR description rather than introducing a new mechanism.
