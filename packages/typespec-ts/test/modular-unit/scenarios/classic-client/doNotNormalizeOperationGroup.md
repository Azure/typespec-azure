# Should preserve DO_NOT_NORMALIZE operation group name in classical client

When using `@@clientLocation` with a `$DO_NOT_NORMALIZE$` prefixed group name, the classical client
should resolve references using the preserved name without double-normalizing.

## TypeSpec

```tsp
model RelayResource {
  name?: string;
}

@route("/items")
interface WcfRelaysOps {
  @get
  get(@query id: string): RelayResource;
}

@@clientLocation(WcfRelaysOps.get, "$DO_NOT_NORMALIZE$wCFRelays", "javascript");
```

This is the tspconfig.yaml.

```yaml
need-tcgc: true
hierarchy-client: true
```

## classicClient

```ts classicClient
import { wCFRelaysOperations, _getwCFRelaysOperations } from "./classic/wCFRelays/index.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
    const userAgentPrefix = prefixFromOptions
      ? `${prefixFromOptions} azsdk-js-client`
      : `azsdk-js-client`;
    this._client = createTesting(endpointParam, {
      ...options,
      userAgentOptions: { userAgentPrefix },
    });
    this.pipeline = this._client.pipeline;
    this.wCFRelays = _getwCFRelaysOperations(this._client);
  }

  /** The operation groups for wCFRelays */
  public readonly wCFRelays: wCFRelaysOperations;
}
```
