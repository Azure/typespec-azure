# Decorator options bag: migration and deprecation policy

Tracks [Azure/typespec-azure#5254](https://github.com/Azure/typespec-azure/issues/5254): making the
`scope` argument accepted by scoped TCGC decorators evolvable via a shared, typed options model.

## Background

Every scoped TCGC decorator (`@clientName`, `@access`, `@usage`, `@client`, etc.) historically
accepted a single trailing positional argument: a plain string scope value such as `"csharp"` or
`"!(java, python)"`. Because this argument is a plain string, it cannot grow additional typed
settings without introducing more positional parameters or a breaking signature change.

## Current state (this change)

- `Azure.ClientGenerator.Core.DecoratorOptions` is a new common model:

  ```typespec
  model DecoratorOptions {
    scope?: string;
  }
  ```

- Every scoped decorator's final `scope` parameter now accepts `DecoratorOptions | string`. This
  means decorators accept **either**:
  - the legacy positional string (`"csharp"`, `"!(java, python)"`), or
  - a typed options bag (`#{ scope: "csharp" }`).
- Individual decorators can later grow their own options model that `extends DecoratorOptions` (e.g.
  `model FooOptions extends DecoratorOptions { extra?: string }`) without breaking other decorators
  still using the shared base options model, and without breaking existing callers of that
  decorator (since new fields on the extended model should remain optional).
- Decorators that **already have their own options bag** (`@client` with `ClientOptions`, and
  `@clientInitialization` with `ClientInitializationOptions`) do not add a second bag. Their options
  model `extends DecoratorOptions`, so `scope` is set directly on that single existing bag, and the
  final `scope` parameter stays a plain `valueof string`. The legacy positional `scope` argument is
  still accepted for backward compatibility. If both the options-bag `scope` and the legacy
  positional argument are specified with **conflicting** values, TCGC reports the
  `conflicting-scope` warning diagnostic, uses the options bag value, and ignores the legacy
  positional argument.
- Reconciling the options-bag `scope` against the legacy positional argument (including the conflict
  diagnostic and precedence) is centralized in a single `resolveScopeFromOptions` helper in
  `decorators.ts`, so every options-bag decorator behaves identically instead of re-implementing the
  compatibility logic.
- Scope normalization (turning either shape into the internal string representation) is
  centralized in `internal-utils.ts` (`normalizeScope`), so decorator implementations do not need
  to special-case both forms themselves.
- Options bags are resolved through their `extends` inheritance chain: for `@client` and
  `@clientInitialization`, every setting (`scope`, `service`, `name`, `parameters`, `initializedBy`,
  etc.) is read via a single `getInheritedOptionType` helper that walks `baseModel`. A user model
  that `extends ClientOptions`/`ClientInitializationOptions` therefore has its base-declared settings
  honored even when the leaf model only adds others, and all settings behave consistently rather than
  only `scope` supporting inheritance.

## Compatibility guarantees

- The legacy positional string scope syntax is fully supported and is **not** deprecated by this
  change. There is no forced migration.
- Decorators using only `DecoratorOptions | string` remain source- and behavior-compatible for all
  existing specs, without exposing a short public `Scope` alias that can conflict with service
  models named `Scope`.

## Deprecation timeline

There is currently **no deprecation timeline** for the legacy positional string scope syntax.
Both forms (string and options bag) are supported side by side indefinitely. A future deprecation
of the positional string form would only be considered once:

1. Migration guidance has been available for at least one full TCGC release cycle.
2. The majority of first-party TCGC-based emitters (C#, Java, Python, JavaScript/TypeScript, Go)
   have migrated their own decorator usage to the options-bag form internally.

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

For `@client`, `scope` can be set directly on `ClientOptions` instead of using the legacy third
argument:

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

The same applies to `@clientInitialization`, whose `ClientInitializationOptions` also extends
`DecoratorOptions`:

```typespec
// Before
@@clientInitialization(
  MyService,
  {
    parameters: MyParams,
  },
  "csharp"
);

// After
@@clientInitialization(
  MyService,
  {
    parameters: MyParams,
    scope: "csharp",
  }
);
```

## Passing extended options models

A decorator only accepts an options bag shaped like its declared `scope` parameter type. Passing a
value typed as a model that `extends DecoratorOptions` with additional properties to a decorator
whose `scope` parameter is still typed as `DecoratorOptions | string` will fail, because the extra
properties aren't assignable to `DecoratorOptions | string`:

```typespec
model MyScopeOptions extends DecoratorOptions {
  extra?: string;
}

// Error: not assignable to DecoratorOptions | string
@clientName("RenamedName", #{ scope: "csharp", extra: "foo" })
op myOperation(): void;
```

To let a specific decorator accept extra options, that decorator's own `scope` parameter type must
be updated to the extended options model (or a decorator-specific union alias built on it). This is
the intended mechanism for evolving individual decorators independently without affecting others
still using the shared base options model.

## Usage instrumentation

TCGC does not currently emit telemetry. Until first-party instrumentation exists, adoption of the
options-bag form vs. the legacy positional form can be approximated by searching spec repositories
for the `#{ scope:` pattern versus the legacy trailing string-literal scope argument. Adding
first-party usage instrumentation is tracked as follow-up work under the parent issue and is not
part of this change.
