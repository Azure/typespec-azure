# keep multiple service clients isolated

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/versioning";

using TypeSpec.Http;
using TypeSpec.Versioning;

namespace MultipleServices;

@service(#{ title: "Service A" })
@versioned(VersionsA)
namespace ServiceA {
  enum VersionsA {
    v1,
  }

  @get
  @route("/root-a")
  op rootA(): void;

  interface Operations {
    @get
    @route("/group-a")
    groupA(): void;
  }
}

@service(#{ title: "Service B" })
@versioned(VersionsB)
namespace ServiceB {
  enum VersionsB {
    v1,
  }

  @get
  @route("/root-b")
  op rootB(): void;

  interface Operations {
    @get
    @route("/group-b")
    groupB(): void;
  }
}
```

```yaml
withRawContent: true
```

## Service A classic client

```ts classicClient ServiceAClient
import { rootA } from "./api/operations.js";
import { RootAOptionalParams } from "./api/options.js";
import { OperationsOperations, _getOperationsOperations } from "./classic/operations/index.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { ServiceAClientOptionalParams } from "./api/serviceAContext.js";

export class ServiceAClient {
  private _client: ServiceAContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: ServiceAClientOptionalParams = {}) {
    this._client = createServiceA(endpointParam, options);
    this.pipeline = this._client.pipeline;
    this.operations = _getOperationsOperations(this._client);
  }

  rootA(options: RootAOptionalParams = { requestOptions: {} }): Promise<void> {
    return rootA(this._client, options);
  }

  /** The operation groups for operations */
  public readonly operations: OperationsOperations;
}
```

## Service B classic client

```ts classicClient ServiceBClient
import { rootB } from "./api/operations.js";
import { RootBOptionalParams } from "./api/options.js";
import { OperationsOperations, _getOperationsOperations } from "./classic/operations/index.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { ServiceBClientOptionalParams } from "./api/serviceBContext.js";

export class ServiceBClient {
  private _client: ServiceBContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: ServiceBClientOptionalParams = {}) {
    this._client = createServiceB(endpointParam, options);
    this.pipeline = this._client.pipeline;
    this.operations = _getOperationsOperations(this._client);
  }

  rootB(options: RootBOptionalParams = { requestOptions: {} }): Promise<void> {
    return rootB(this._client, options);
  }

  /** The operation groups for operations */
  public readonly operations: OperationsOperations;
}
```
