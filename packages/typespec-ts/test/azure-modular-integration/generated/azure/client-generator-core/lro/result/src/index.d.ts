import { AbortSignalLike } from '@azure/abort-controller';
import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { OperationState } from '@azure/core-lro';
import { PathUncheckedResponse } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { PollerLike } from '@azure/core-lro';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface CreateDefaultOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface CreateWithClientLroResultOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface GetClientResultJobOptionalParams extends OperationOptions {
}

export declare interface GetDefaultJobOptionalParams extends OperationOptions {
}

export { isRestError }

export declare interface Job {
    readonly id: string;
    status: "Running" | "Succeeded" | "Failed" | "Canceled";
    result?: JobResult;
}

export declare interface JobResult {
    value: string;
}

export declare enum KnownVersions {
    V20221201Preview = "2022-12-01-preview"
}

export declare interface PollClientResultJobOptionalParams extends OperationOptions {
}

export declare interface PollDefaultJobOptionalParams extends OperationOptions {
}

export { RestError }

export declare function restorePoller<TResponse extends PathUncheckedResponse, TResult>(client: ResultClient, serializedState: string, sourceOperation: (...args: any[]) => PollerLike<OperationState<TResult>, TResult>, options?: RestorePollerOptions<TResult>): PollerLike<OperationState<TResult>, TResult>;

export declare interface RestorePollerOptions<TResult, TResponse extends PathUncheckedResponse = PathUncheckedResponse> extends OperationOptions {
    updateIntervalInMs?: number;
    abortSignal?: AbortSignalLike;
    processResponseBody?: (result: TResponse) => Promise<TResult>;
}

export declare class ResultClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ResultClientOptionalParams);
    createWithClientLroResult(id: string, resource: Job, options?: CreateWithClientLroResultOptionalParams): PollerLike<OperationState<JobResult>, JobResult>;
    pollClientResultJob(id: string, options?: PollClientResultJobOptionalParams): Promise<Job>;
    getClientResultJob(id: string, options?: GetClientResultJobOptionalParams): Promise<Job>;
    createDefault(id: string, resource: Job, options?: CreateDefaultOptionalParams): PollerLike<OperationState<Job>, Job>;
    pollDefaultJob(id: string, options?: PollDefaultJobOptionalParams): Promise<Job>;
    getDefaultJob(id: string, options?: GetDefaultJobOptionalParams): Promise<Job>;
}

export declare interface ResultClientOptionalParams extends ClientOptions {
    apiVersion?: string;
}

export { }
