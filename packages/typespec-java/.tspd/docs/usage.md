### Initialize TypeSpec Project

Follow [TypeSpec Getting Started](https://typespec.io/docs/) to initialize your TypeSpec project.

Make sure `npx tsp compile .` runs correctly.

### Generate Java

Run `npx tsp compile client.tsp --emit=@azure-tools/typespec-java`
or `npx tsp compile client.tsp --emit=@azure-tools/typespec-java --options='@azure-tools/typespec-java.emitter-output-dir=<target-folder>'`.

If the `emitter-output-dir` option is not provided, the generated Java code will be under the `tsp-output/@azure-tools/typespec-java` folder.

A typical `tspconfig.yaml` looks like:

```yaml
emit:
  - "@azure-tools/typespec-java"
options:
  "@azure-tools/typespec-java":
    emitter-output-dir: "{project-root}/azure-ai-language-authoring"
    service-name: "Authoring"
    generate-samples: true
    generate-tests: true
    partial-update: false
    api-version: "2023-11-01"
```

### Java client options

The Java emitter supports these `@clientOption` values from
`@azure-tools/typespec-client-generator-core`:

| Option                   | Target                                           | Value    | Behavior                                                                                                          |
| ------------------------ | ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `clientRequired`         | Operation parameter or model property            | `true`   | Treats an optional TypeSpec property as required in the generated client API.                                     |
| `responseHeadersAsModel` | Operation with response headers and no body      | `true`   | Returns the response headers as a strongly typed model from the convenience method.                               |
| `collectionHeaderPrefix` | Dictionary-valued response header model property | `string` | Deserializes response headers with the configured prefix into the dictionary while removing the prefix from keys. |

Specify `"java"` as the language scope:

```typespec
@@clientOption(ReadOptions.filter, "clientRequired", true, "java");
@@clientOption(ResponseHeaderOp.getResourceMetadata, "responseHeadersAsModel", true, "java");
@@clientOption(MetadataHeaders.metadata, "collectionHeaderPrefix", "x-ms-meta-", "java");
```
