# Should generate credential in api key auth client

Should generate credential in api key auth client.

## TypeSpec

This is tsp definition.

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
@service(#{ title: "Demo Service" })
@versioned(Versions)
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
namespace DemoService;

enum Versions {
  /** Version 2021-10-01-preview */
  `2021-10-01-preview`,
}

@doc("show example demo")
op read(name: string): {
  @body body: {};
};
```

## Example

Raw json files.

```json for read
{
  "title": "read",
  "operationId": "read",
  "parameters": {
    "readRequest": {
      "name": "test"
    }
  },
  "responses": {
    "200": {}
  }
}
```

## Samples

Generate samples for non-hierarchy cases:

```ts samples
/** This file path is /samples-dev/readSample.ts */
import { DemoServiceClient } from "@azure/internal-test";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * This sample demonstrates how to show example demo
 *
 * @summary show example demo
 * x-ms-original-file: 2021-10-01-preview/json_for_read.json
 */
async function read(): Promise<void> {
  const endpoint = process.env.DEMO_SERVICE_ENDPOINT || "";
  const credential = new DefaultAzureCredential();
  const client = new DemoServiceClient(endpoint, credential);
  const result = await client.read("test");
  console.log(result);
}

async function main(): Promise<void> {
  await read();
}

main().catch(console.error);
```
