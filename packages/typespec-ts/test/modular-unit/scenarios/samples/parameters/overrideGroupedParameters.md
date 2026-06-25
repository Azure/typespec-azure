# Should nest grouped parameters in samples when using @@override

Sample generation should respect `@@override` parameter grouping and nest the grouped
query parameters under their wrapper method parameter (e.g. `queryOptions`) instead of
emitting them flat on the options object.

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{ title: "Override Service" })
namespace Override;

// Original operation with separate optional query parameters
@route("/policyEvents")
@get
op listQueryResultsOriginal(
  @query fromParam?: utcDateTime,
  @query filter?: string,
): void;

// Override model to group the query parameters
model QueryOptions {
  @query fromParam?: utcDateTime;
  @query filter?: string;
}

// Override operation with the grouped (optional) query options
op listQueryResultsCustomized(queryOptions?: QueryOptions): void;

@@override(Override.listQueryResultsOriginal, Override.listQueryResultsCustomized);
```

The config would be like:

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Provide examples and generated samples

Raw json files.

```json for listQueryResultsOriginal
{
  "title": "listQueryResultsOriginal",
  "operationId": "listQueryResultsOriginal",
  "parameters": {
    "fromParam": "2018-02-05T18:00:00Z",
    "filter": "PolicyDefinitionAction eq 'deny'"
  },
  "responses": {
    "204": {}
  }
}
```

Generated samples.

```ts samples
/** This file path is /samples-dev/listQueryResultsOriginalSample.ts */
import { OverrideClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute listQueryResultsOriginal
 *
 * @summary execute listQueryResultsOriginal
 * x-ms-original-file: 2021-10-01-preview/json_for_listQueryResultsOriginal.json
 */
async function listQueryResultsOriginal(): Promise<void> {
  const endpoint = process.env.OVERRIDE_ENDPOINT || "";
  const client = new OverrideClient(endpoint);
  await client.listQueryResultsOriginal({
    queryOptions: {
      fromParam: new Date("2018-02-05T18:00:00Z"),
      filter: "PolicyDefinitionAction eq 'deny'",
    },
  });
}

async function main(): Promise<void> {
  await listQueryResultsOriginal();
}

main().catch(console.error);
```
