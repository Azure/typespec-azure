This diagnostic is issued when a root namespace decorated with `@client` does not specify a service configuration.

## Impact

- **Area:** Root client construction. Blocks building an explicit root client because TCGC cannot determine which service metadata it represents.
- **Not affected:** The service namespace itself remains valid.

#### ❌ Incorrect Usage

```typespec
@client
namespace WidgetClient {

}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Root namespace decorated with @client must have service config.
```

#### ✅ How to Fix

Add the `service` option to the root `@client`, or make the client nested under a parent client whose services it should inherit:

```typespec
@service
namespace WidgetService;

@client({
  service: WidgetService,
})
namespace WidgetClient {

}
```
