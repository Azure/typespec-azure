This diagnostic is issued when `@client` is applied through an augment decorator instead of directly on a namespace or interface in `client.tsp`.

To fix this issue, place `@client` directly on the namespace or interface declaration that represents the client.

### Example

Instead of augmenting a namespace with `@@client`:

```typespec
@service
namespace ServiceNamespace;

namespace ClientNamespace {

}
@@client(
  ClientNamespace,
  {
    service: ServiceNamespace,
  }
);
```

Place `@client` directly on the declaration:

```typespec
@service
namespace ServiceNamespace;

@client({
  service: ServiceNamespace,
})
namespace ClientNamespace {

}
```
