# When a method mixes a flat parameter with a grouped model, samples should emit each once

A flat required query parameter and a grouped query model live on the same operation.
The flat parameter is emitted positionally while the grouped model is nested inside the
options bag, proving both are resolved through the same `methodParameterSegments` path
without special casing.

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{ title: "Sample Service" })
@server(
  "{endpoint}",
  "Sample endpoint",
  {
    @doc("The endpoint URL")
    endpoint: string = "https://example.com",
  }
)
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
  list(@query("category") category: string, queryOptions?: QueryOptions): Item[];
}
```

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Example

```json
{
  "title": "List items with a flat parameter and grouped query options",
  "operationId": "Items_list",
  "parameters": {
    "category": "books",
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
/** This file path is /samples-dev/listSample.ts */
import { SampleServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute list
 *
 * @summary execute list
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function listItemsWithAFlatParameterAndGroupedQueryOptions(): Promise<void> {
  const client = new SampleServiceClient();
  const result = await client.list("books", {
    queryOptions: { top: 10, filter: "name eq 'test'", orderBy: "name asc" },
  });
  console.log(result);
}

async function main(): Promise<void> {
  await listItemsWithAFlatParameterAndGroupedQueryOptions();
}

main().catch(console.error);
```

# When a grouped query model is optional, samples should nest it inside the options bag

An optional grouped query model is the only method parameter. It is resolved through its
`methodParameterSegments` path and nested under its root name inside the options bag.

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{ title: "Sample Service" })
@server(
  "{endpoint}",
  "Sample endpoint",
  {
    @doc("The endpoint URL")
    endpoint: string = "https://example.com",
  }
)
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
  list(queryOptions?: QueryOptions): Item[];
}
```

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Example

```json
{
  "title": "List items with optional query options",
  "operationId": "Items_list",
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
/** This file path is /samples-dev/listSample.ts */
import { SampleServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute list
 *
 * @summary execute list
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function listItemsWithOptionalQueryOptions(): Promise<void> {
  const client = new SampleServiceClient();
  const result = await client.list({
    queryOptions: { top: 10, filter: "name eq 'test'", orderBy: "name asc" },
  });
  console.log(result);
}

async function main(): Promise<void> {
  await listItemsWithOptionalQueryOptions();
}

main().catch(console.error);
```

# When a grouped query model is required, samples should nest it positionally

A required grouped query model is the only method parameter. It is emitted positionally as
the model itself, resolved through its `methodParameterSegments` path.

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{ title: "Sample Service" })
@server(
  "{endpoint}",
  "Sample endpoint",
  {
    @doc("The endpoint URL")
    endpoint: string = "https://example.com",
  }
)
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
  list(queryOptions: QueryOptions): Item[];
}
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
  "operationId": "Items_list",
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
/** This file path is /samples-dev/listSample.ts */
import { SampleServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute list
 *
 * @summary execute list
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function listItemsWithRequiredQueryOptions(): Promise<void> {
  const client = new SampleServiceClient();
  const result = await client.list({ top: 10, filter: "name eq 'test'", orderBy: "name asc" });
  console.log(result);
}

async function main(): Promise<void> {
  await listItemsWithRequiredQueryOptions();
}

main().catch(console.error);
```
