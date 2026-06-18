# When @@override groups query params into a model, samples should nest them

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{ title: "Sample Service" })
@server("{endpoint}", "Sample endpoint", {
  @doc("The endpoint URL")
  endpoint: string = "https://example.com",
})
namespace SampleService;

model Item {
  id: string;
  name: string;
}

model QueryOptions {
  @query("$top") top?: int32;
  @query("$filter") filter?: string;
  @query("$orderby") orderBy?: string;
}

@route("/items")
interface Items {
  @get
  listOriginal(@query("$top") top?: int32, @query("$filter") filter?: string, @query("$orderby") orderBy?: string): Item[];
}

op listCustomized(queryOptions?: QueryOptions): Item[];

@@override(Items.listOriginal, SampleService.listCustomized);
```

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Example

```json
{
  "title": "List items with query options",
  "operationId": "Items_listOriginal",
  "parameters": {
    "$top": 10,
    "$filter": "name eq 'test'",
    "$orderby": "name asc"
  },
  "responses": {
    "200": {
      "body": [
        {
          "id": "item1",
          "name": "test"
        }
      ]
    }
  }
}
```

## Generated Sample

```ts samples
/** This file path is /samples-dev/listOriginalSample.ts */
import { SampleServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute listOriginal
 *
 * @summary execute listOriginal
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function listItemsWithQueryOptions(): Promise<void> {
  const client = new SampleServiceClient();
  const result = await client.listOriginal({
    queryOptions: { top: 10, filter: "name eq 'test'", orderBy: "name asc" },
  });
  console.log(result);
}

async function main(): Promise<void> {
  await listItemsWithQueryOptions();
}

main().catch(console.error);
```

# When @@override groups query params into a required model, samples should nest them positionally

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{ title: "Sample Service" })
@server("{endpoint}", "Sample endpoint", {
  @doc("The endpoint URL")
  endpoint: string = "https://example.com",
})
namespace SampleService;

model Item {
  id: string;
  name: string;
}

model QueryOptions {
  @query("$top") top?: int32;
  @query("$filter") filter?: string;
  @query("$orderby") orderBy?: string;
}

@route("/items")
interface Items {
  @get
  listOriginal(@query("$top") top?: int32, @query("$filter") filter?: string, @query("$orderby") orderBy?: string): Item[];
}

op listCustomized(queryOptions: QueryOptions): Item[];

@@override(Items.listOriginal, SampleService.listCustomized);
```

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Example

```json
{
  "title": "List items with required query options",
  "operationId": "Items_listOriginal",
  "parameters": {
    "$top": 10,
    "$filter": "name eq 'test'",
    "$orderby": "name asc"
  },
  "responses": {
    "200": {
      "body": [
        {
          "id": "item1",
          "name": "test"
        }
      ]
    }
  }
}
```

## Generated Sample

```ts samples
/** This file path is /samples-dev/listOriginalSample.ts */
import { SampleServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute listOriginal
 *
 * @summary execute listOriginal
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function listItemsWithRequiredQueryOptions(): Promise<void> {
  const client = new SampleServiceClient();
  const result = await client.listOriginal({
    top: 10,
    filter: "name eq 'test'",
    orderBy: "name asc",
  });
  console.log(result);
}

async function main(): Promise<void> {
  await listItemsWithRequiredQueryOptions();
}

main().catch(console.error);
```
