# Scope options bag: migration and deprecation policy

Tracks [Azure/typespec-azure#5254](https://github.com/Azure/typespec-azure/issues/5254): making the
`scope` argument accepted by scoped TCGC decorators evolvable via a shared, typed options model.

## Background

Every scoped TCGC decorator (`@clientName`, `@access`, `@usage`, `@client`, etc.) historically
accepted a single trailing positional argument: a plain string scope value such as `"csharp"` or
`"!(java, python)"`. Because this argument is a plain string, it cannot grow additional typed
settings without introducing more positional parameters or a breaking signature change.

## Current state (this change)

- `Azure.ClientGenerator.Core.ScopeOptions` is a new common model:

  ```typespec
  model ScopeOptions {
    scope?: string;
  }
  ```

- `Azure.ClientGenerator.Core.Scope` is now `ScopeOptions | string`, and every scoped decorator's
  final `scope` parameter accepts this shared alias. This means decorators accept **either**:
  - the legacy positional string (`"csharp"`, `"!(java, python)"`), or
  - a typed options bag (`#{ scope: "csharp" }`).
- Individual decorators can later grow their own options model that `extends ScopeOptions` (e.g.
  `model FooOptions extends ScopeOptions { extra?: string }`) without breaking other decorators
  still using the shared `Scope` alias, and without breaking existing callers of that decorator
  (since new fields on the extended model should remain optional).
- `@client` additionally accepts `scope` directly on its existing `ClientOptions` bag. The legacy
  third positional `scope` argument is still accepted. If both are specified with **conflicting**
  values, TCGC reports the `conflicting-scope` diagnostic and does not apply the decorator.
- Scope normalization (turning either shape into the internal string representation) and basic
  validation (rejecting empty/malformed scope strings via the `invalid-scope` diagnostic) are
  centralized in `internal-utils.ts` (`normalizeScope`, `isValidScopeString`), so decorator
  implementations do not need to special-case both forms themselves.

## Compatibility guarantees

- The legacy positional string scope syntax is fully supported and is **not** deprecated by this
  change. There is no forced migration.
- Decorators using only the shared `Scope` alias remain source- and behavior-compatible for all
  existing specs.

## Deprecation timeline

There is currently **no deprecation timeline** for the legacy positional string scope syntax.
Both forms (string and options bag) are supported side by side indefinitely. A future deprecation
of the positional string form would only be considered once:

1. Migration code fixes exist and have been available for at least one full TCGC release cycle.
2. The majority of first-party TCGC-based emitters (C#, Java, Python, JavaScript/TypeScript, Go)
   have migrated their own decorator usage to the options-bag form internally.
3. Usage telemetry (see below) shows options-bag adoption is broadly viable for spec authors.

If a deprecation is proposed in the future, it will follow the standard TypeSpec deprecation
policy: a `@deprecated` warning period of at least two minor releases before any removal, tracked
in a dedicated changeset and issue.

## Migration guidance

Existing specs do not need to change. To adopt the options-bag form for a specific decorator call,
replace the trailing positional scope string with an options bag containing a `scope` property:

```typespec
// Before
@clientName("RenamedName", "csharp")
op myOperation(): void;

// After
@clientName("RenamedName", #{ scope: "csharp" })
op myOperation(): void;
```

For `@client`, `scope` can be set directly on `ClientOptions` instead of (or in addition to,
as long as it agrees with) the legacy third argument:

```typespec
// Before
@client(
  {
    service: MyService,
  },
  "csharp"
)
interface MyInterface {}

// After
@client({
  service: MyService,
  scope: "csharp",
})
interface MyInterface {}
```

## Usage instrumentation

TCGC does not currently emit telemetry. Until first-party instrumentation exists, adoption of the
options-bag form vs. the legacy positional form can be approximated by searching spec repositories
for the `#{ scope:` pattern versus the legacy trailing string-literal scope argument. Adding
first-party usage instrumentation is tracked as follow-up work under the parent issue and is not
part of this change.
