# LRO metadata state and compatibility poller

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.Core;
using Azure.ClientGenerator.Core;

@service
namespace MetadataService;

model Result {
  value: string;
}

model Monitor {
  status: Azure.Core.Foundations.OperationState;

  @lroOperationId
  id: string;

  @lroStatusMetadata
  @clientName("config")
  progress: int32;

  result?: Result;
}

@route("/jobs/{id}")
@get
op getStatus(@lroOperationId @path id: string): Monitor;

@route("/jobs")
@post
@pollingOperation(getStatus)
op deserializeJob(): Azure.Core.Foundations.AcceptedResponse &
  Azure.Core.Foundations.LongRunningStatusLocation<Monitor>;
```

```yaml
withRawContent: true
compatibility-lro: true
```

## Operations

```ts operations
import { MetadataServiceContext as Client } from "./index.js";
import { Monitor, monitorDeserializer, Result, resultDeserializer } from "../models/models.js";
import { getLongRunningPoller, getPathParameterFromUrl } from "../static-helpers/pollingHelpers.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { DeserializeJobOptionalParams, GetStatusOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { PollerLike, OperationState } from "@azure/core-lro";

/** Metadata values are live, non-enumerable getters omitted by object spread, JSON serialization, and continuation tokens. */
export interface DeserializeJobOperationState extends OperationState<Result> {
  /** The service-issued identifier of the long-running operation. */
  readonly operationId?: string;
  readonly configMetadata?: number;
}

export function _deserializeJobSend(
  context: Client,
  options: DeserializeJobOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/jobs").post({ ...operationOptionsToRequestParameters(options) });
}

export async function _deserializeJobDeserialize(result: PathUncheckedResponse): Promise<Result> {
  const expectedStatuses = ["202", "200", "201"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  if (result?.body?.result === undefined) {
    throw createRestError(
      `Expected a result in the response at position "result.body.result"`,
      result,
    );
  }

  return resultDeserializer(result.body.result);
}

export function _deserializeJobGetOperationMetadata(
  statusMonitorResponse: PathUncheckedResponse | undefined,
  operationLocation: string | undefined,
): { operationId?: string; configMetadata?: number } {
  const body = statusMonitorResponse?.body;
  const status = body == null ? undefined : monitorDeserializer(body);
  return {
    operationId: status?.id ?? getPathParameterFromUrl(operationLocation, "/jobs/{id}", "id"),
    configMetadata: status?.config,
  };
}

export function deserializeJob(
  context: Client,
  options: DeserializeJobOptionalParams = { requestOptions: {} },
): PollerLike<DeserializeJobOperationState, Result> {
  return getLongRunningPoller(context, _deserializeJobDeserialize, ["202", "200", "201"], {
    updateIntervalInMs: options?.updateIntervalInMs,
    abortSignal: options?.abortSignal,
    getInitialResponse: () => _deserializeJobSend(context, options),
    resourceLocationConfig: "operation-location",

    getOperationMetadata: _deserializeJobGetOperationMetadata,
  }) as PollerLike<DeserializeJobOperationState, Result>;
}

export function _getStatusSend(
  context: Client,
  id: string,
  options: GetStatusOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/jobs/{id}",
    {
      id: id,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "application/json", ...options.requestOptions?.headers },
  });
}

export async function _getStatusDeserialize(result: PathUncheckedResponse): Promise<Monitor> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return monitorDeserializer(result.body);
}

export async function getStatus(
  context: Client,
  id: string,
  options: GetStatusOptionalParams = { requestOptions: {} },
): Promise<Monitor> {
  const result = await _getStatusSend(context, id, options);
  return _getStatusDeserialize(result);
}
```

## Restore poller

```ts restorePoller
export function restorePoller<
  TResponse extends PathUncheckedResponse,
  TResult,
  TState extends OperationState<TResult> = OperationState<TResult>,
>(
  client: MetadataServiceClient,
  serializedState: string,
  sourceOperation: (...args: any[]) => PollerLike<TState, TResult>,
  options?: RestorePollerOptions<TResult>,
): PollerLike<TState, TResult> {
  const pollerConfig = deserializeState(serializedState).config;
  const { initialRequestUrl, requestMethod, metadata } = pollerConfig;
  if (!initialRequestUrl || !requestMethod) {
    throw new Error(
      `Invalid serialized state: ${serializedState} for sourceOperation ${sourceOperation?.name}`,
    );
  }
  const resourceLocationConfig = metadata?.["resourceLocationConfig"] as
    ResourceLocationConfig | undefined;
  const {
    deserializer,
    expectedStatuses = [],
    getOperationMetadata,
  } = getDeserializationHelper(initialRequestUrl, requestMethod) ?? {};
  const deserializeHelper = options?.processResponseBody ?? deserializer;
  if (!deserializeHelper) {
    throw new Error(
      `Please ensure the operation is in this client! We can't find its deserializeHelper for ${sourceOperation?.name}.`,
    );
  }
  const apiVersion = getApiVersionFromUrl(initialRequestUrl);
  return getLongRunningPoller(
    (client as any)["_client"] ?? client,
    deserializeHelper as (result: TResponse) => Promise<TResult>,
    expectedStatuses,
    {
      updateIntervalInMs: options?.updateIntervalInMs,
      abortSignal: options?.abortSignal,
      resourceLocationConfig,
      restoreFrom: serializedState,
      initialRequestUrl,
      apiVersion,
      getOperationMetadata,
    },
  ) as PollerLike<TState, TResult>;
}

const deserializeMap: Record<string, DeserializationHelper> = {
  "POST /jobs": {
    deserializer: _deserializeJobDeserialize,
    expectedStatuses: ["202", "200", "201"],
    getOperationMetadata: _deserializeJobGetOperationMetadata,
  },
};
```

## Classical client

```ts classicClient
import { DeserializeJobOperationState, deserializeJob, getStatus } from "./api/operations.js";
import { DeserializeJobOptionalParams, GetStatusOptionalParams } from "./api/options.js";
import { Monitor, Result } from "./models/models.js";
import { SimplePollerLike, getSimplePoller } from "./static-helpers/simplePollerHelpers.js";
import { PollerLike } from "@azure/core-lro";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { MetadataServiceClientOptionalParams } from "./api/metadataServiceContext.js";

export class MetadataServiceClient {
  private _client: MetadataServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: MetadataServiceClientOptionalParams = {}) {
    this._client = createMetadataService(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  deserializeJob(
    options: DeserializeJobOptionalParams = { requestOptions: {} },
  ): PollerLike<DeserializeJobOperationState, Result> {
    return deserializeJob(this._client, options);
  }

  /** @deprecated use deserializeJob instead */
  async beginDeserializeJob(
    options: DeserializeJobOptionalParams = { requestOptions: {} },
  ): Promise<SimplePollerLike<DeserializeJobOperationState, Result>> {
    const poller = deserializeJob(this._client, options);
    await poller.submitted();
    return getSimplePoller(poller);
  }

  /** @deprecated use deserializeJob instead */
  async beginDeserializeJobAndWait(
    options: DeserializeJobOptionalParams = { requestOptions: {} },
  ): Promise<Result> {
    return await deserializeJob(this._client, options);
  }

  getStatus(
    id: string,
    options: GetStatusOptionalParams = { requestOptions: {} },
  ): Promise<Monitor> {
    return getStatus(this._client, id, options);
  }
}
```

# Grouped compatibility pollers retain metadata state

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.Core;
using Azure.ClientGenerator.Core;

@service
namespace GroupedMetadata;

model Result {
  value: string;
}
model Monitor {
  status: Azure.Core.Foundations.OperationState;
  @lroStatusMetadata progress: int32;
  result?: Result;
}

@route("/jobs/status")
@get
op getStatus(): Monitor;

interface Jobs {
  @route("/jobs")
  @post
  @pollingOperation(getStatus)
  run(): Azure.Core.Foundations.AcceptedResponse &
    Azure.Core.Foundations.LongRunningStatusLocation<Monitor>;
}
```

```yaml
withRawContent: true
compatibility-lro: true
```

```ts classicOperations interface JobsOperations
/** Interface representing a Jobs operations. */
export interface JobsOperations {
  run: (options?: JobsRunOptionalParams) => PollerLike<RunOperationState, Result>;
  /** @deprecated use run instead */
  beginRun: (
    options?: JobsRunOptionalParams,
  ) => Promise<SimplePollerLike<RunOperationState, Result>>;
  /** @deprecated use run instead */
  beginRunAndWait: (options?: JobsRunOptionalParams) => Promise<Result>;
}
```

# Restore helpers with duplicate names containing Deserialize

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.Core;
using Azure.ClientGenerator.Core;

@service
namespace DuplicateMetadata;

model Result {
  value: string;
}
model Monitor {
  status: Azure.Core.Foundations.OperationState;
  @lroStatusMetadata progress: int32;
  result?: Result;
}

@route("/jobs/status")
@get
op getStatus(): Monitor;

interface First {
  @route("/first")
  @post
  @pollingOperation(getStatus)
  deserializeJob(): Azure.Core.Foundations.AcceptedResponse &
    Azure.Core.Foundations.LongRunningStatusLocation<Monitor>;
}
interface Second {
  @route("/second")
  @post
  @pollingOperation(getStatus)
  deserializeJob(): Azure.Core.Foundations.AcceptedResponse &
    Azure.Core.Foundations.LongRunningStatusLocation<Monitor>;
}
```

```yaml
withRawContent: true
hierarchy-client: true
```

```ts restorePoller
export function restorePoller<
  TResponse extends PathUncheckedResponse,
  TResult,
  TState extends OperationState<TResult> = OperationState<TResult>,
>(
  client: DuplicateMetadataClient,
  serializedState: string,
  sourceOperation: (...args: any[]) => PollerLike<TState, TResult>,
  options?: RestorePollerOptions<TResult>,
): PollerLike<TState, TResult> {
  const pollerConfig = deserializeState(serializedState).config;
  const { initialRequestUrl, requestMethod, metadata } = pollerConfig;
  if (!initialRequestUrl || !requestMethod) {
    throw new Error(
      `Invalid serialized state: ${serializedState} for sourceOperation ${sourceOperation?.name}`,
    );
  }
  const resourceLocationConfig = metadata?.["resourceLocationConfig"] as
    ResourceLocationConfig | undefined;
  const {
    deserializer,
    expectedStatuses = [],
    getOperationMetadata,
  } = getDeserializationHelper(initialRequestUrl, requestMethod) ?? {};
  const deserializeHelper = options?.processResponseBody ?? deserializer;
  if (!deserializeHelper) {
    throw new Error(
      `Please ensure the operation is in this client! We can't find its deserializeHelper for ${sourceOperation?.name}.`,
    );
  }
  const apiVersion = getApiVersionFromUrl(initialRequestUrl);
  return getLongRunningPoller(
    (client as any)["_client"] ?? client,
    deserializeHelper as (result: TResponse) => Promise<TResult>,
    expectedStatuses,
    {
      updateIntervalInMs: options?.updateIntervalInMs,
      abortSignal: options?.abortSignal,
      resourceLocationConfig,
      restoreFrom: serializedState,
      initialRequestUrl,
      apiVersion,
      getOperationMetadata,
    },
  ) as PollerLike<TState, TResult>;
}

const deserializeMap: Record<string, DeserializationHelper> = {
  "POST /second": {
    deserializer: _deserializeJobDeserialize,
    expectedStatuses: ["202", "200", "201"],
    getOperationMetadata: _deserializeJobGetOperationMetadata,
  },
  "POST /first": {
    deserializer: _deserializeJobDeserializeFirst,
    expectedStatuses: ["202", "200", "201"],
    getOperationMetadata: _deserializeJobGetOperationMetadataFirst,
  },
};
```
