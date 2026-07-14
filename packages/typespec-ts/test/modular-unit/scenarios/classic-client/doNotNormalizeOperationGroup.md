# should preserve $DO_NOT_NORMALIZE$ operation-group names in classical client

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ClientGenerator.Core;

@service(#{ title: "Relay Service" })
namespace Azure.Relay;

model RelayResource {
  name?: string;
}

@route("/items")
interface WcfRelaysOps {
  @get
  get(@query id: string): RelayResource;
}

@@clientLocation(WcfRelaysOps.get, "$DO_NOT_NORMALIZE$wCFRelays");
```

```yaml
withRawContent: true
```

## classicClient

```ts classicClient
import { wCFRelaysOperations, _getwCFRelaysOperations } from "./classic/wCFRelays/index.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { RelayClientOptionalParams } from "./api/relayContext.js";

export class RelayClient {
  private _client: RelayContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: RelayClientOptionalParams = {}) {
    this._client = createRelay(endpointParam, options);
    this.pipeline = this._client.pipeline;
    this.wCFRelays = _getwCFRelaysOperations(this._client);
  }

  /** The operation groups for wCFRelays */
  public readonly wCFRelays: wCFRelaysOperations;
}
```
