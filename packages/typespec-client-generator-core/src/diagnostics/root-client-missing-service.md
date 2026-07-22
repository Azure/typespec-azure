This diagnostic is issued when a root namespace decorated with `@client` does not specify a service configuration.

To fix this issue, add the `service` option to the root `@client`, or make the client nested under a parent client whose services it should inherit.

### Example

Instead of:

```typespec
@client
namespace WidgetClient {

}
```

Specify the service for the root client:

```typespec
@service
namespace WidgetService;

@client({
  service: WidgetService,
})
namespace WidgetClient {

}
```
