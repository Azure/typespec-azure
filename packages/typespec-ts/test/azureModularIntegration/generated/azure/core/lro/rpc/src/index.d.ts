import { ClientOptions, OperationOptions, PathUncheckedResponse } from "@azure-rest/core-client";
import { AbortSignalLike } from "@azure/abort-controller";
import { OperationState, PollerLike } from "@azure/core-lro";
import { isRestError, Pipeline, RestError } from "@azure/core-rest-pipeline";

export declare interface GenerationOptions {
  prompt: string;
}

export declare interface GenerationResult {
  data: string;
}

export { isRestError };

export declare enum KnownVersions {
  V20221201Preview = "2022-12-01-preview",
}

export declare interface LongRunningRpcOptionalParams extends OperationOptions {
  updateIntervalInMs?: number;
}

export { RestError };

export declare function restorePoller<TResponse extends PathUncheckedResponse, TResult>(
  client: RpcClient,
  serializedState: string,
  sourceOperation: (...args: any[]) => PollerLike<OperationState<TResult>, TResult>,
  options?: RestorePollerOptions<TResult>,
): PollerLike<OperationState<TResult>, TResult>;

export declare interface RestorePollerOptions<
  TResult,
  TResponse extends PathUncheckedResponse = PathUncheckedResponse,
> extends OperationOptions {
  updateIntervalInMs?: number;
  abortSignal?: AbortSignalLike;
  processResponseBody?: (result: TResponse) => Promise<TResult>;
}

export declare class RpcClient {
  private _client;
  readonly pipeline: Pipeline;
  constructor(options?: RpcClientOptionalParams);
  longRunningRpc(
    body: GenerationOptions,
    options?: LongRunningRpcOptionalParams,
  ): PollerLike<OperationState<GenerationResult>, GenerationResult>;
}

export declare interface RpcClientOptionalParams extends ClientOptions {
  apiVersion?: string;
}

export {};
