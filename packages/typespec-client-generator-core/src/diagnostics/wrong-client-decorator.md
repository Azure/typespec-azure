This diagnostic is issued when `@client` is applied through an augment decorator instead of directly on a namespace or interface in `client.tsp`.

## Impact

- **Area:** Explicit client declaration. Generation continues, but the augmented `@client` application is ignored because clients must be declared directly.
- **Not affected:** The namespace or interface itself remains in the TypeSpec program.

## ❌ Incorrect Usage

```typespec
@service
namespace ServiceNamespace;

namespace ClientNamespace {

}
@@client( // `@client` cannot be applied as an augment decorator
  ClientNamespace,
  {
    service: ServiceNamespace,
  }
);
```

## Diagnostic Message

TCGC reports:

```text
@client should decorate namespace or interface in client.tsp
```

## ✅ How to Fix

Place `@client` directly on the namespace or interface declaration that represents the client:

```typespec
@service
namespace ServiceNamespace;

@client({
  service: ServiceNamespace,
})
namespace ClientNamespace {

}
```

## Suppression

Suppress this warning only during a migration where an augmented `@client` is intentionally ignored and another valid client declaration is used instead.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/wrong-client-decorator" "augmented @client intentionally ignored"
```
