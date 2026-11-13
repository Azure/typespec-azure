import { AbortSignalLike } from '@azure/abort-controller';
import { ClientOptions } from '@azure-rest/core-client';
import { ErrorModel } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { OperationState as OperationState_2 } from '@azure/core-lro';
import { PathUncheckedResponse } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { PollerLike } from '@azure/core-lro';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface AnalyzeJobOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface AnalyzeJobWithFailureOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface AnalyzeWithUsageOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface ContentAnalysisResult {
    contents: string;
}

export declare interface ContentAnalysisStatus {
    id: string;
    status: OperationState;
    usage?: UsageDetails;
    result?: ContentAnalysisResult;
}

export declare interface GetContentAnalysisStatusOptionalParams extends OperationOptions {
}

export declare interface GetLanguageJobStatusOptionalParams extends OperationOptions {
}

export { isRestError }

export declare interface JobItemError {
    code: string;
    message: string;
    target: string;
}

export declare interface JobStatistics {
    total: number;
    succeeded: number;
    failed: number;
}

export declare interface JobTimestamps {
    createdDateTime: Date;
    lastUpdatedDateTime: Date;
    expirationDateTime: Date;
}

export declare enum KnownVersions {
    V20221201Preview = "2022-12-01-preview"
}

export declare interface LanguageJobResult {
    documents: string[];
}

export declare interface LanguageJobStatus extends JobTimestamps {
    jobId: string;
    displayName: string;
    statistics?: JobStatistics;
    errors?: JobItemError[];
    status: OperationState;
    error?: ErrorModel;
    result?: LanguageJobResult;
}

export declare class MetadataClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: MetadataClientOptionalParams);
    analyzeJobWithFailure(options?: AnalyzeJobWithFailureOptionalParams): PollerLike<OperationState_2<LanguageJobResult> & {
        readonly jobId?: string;
        readonly displayName?: string;
        readonly statistics?: JobStatistics;
        readonly errors?: JobItemError[];
        readonly createdDateTime?: Date;
        readonly lastUpdatedDateTime?: Date;
        readonly expirationDateTime?: Date;
    }, LanguageJobResult>;
    analyzeJob(options?: AnalyzeJobOptionalParams): PollerLike<OperationState_2<LanguageJobResult> & {
        readonly jobId?: string;
        readonly displayName?: string;
        readonly statistics?: JobStatistics;
        readonly errors?: JobItemError[];
        readonly createdDateTime?: Date;
        readonly lastUpdatedDateTime?: Date;
        readonly expirationDateTime?: Date;
    }, LanguageJobResult>;
    getLanguageJobStatus(jobId: string, options?: GetLanguageJobStatusOptionalParams): Promise<LanguageJobStatus>;
    analyzeWithUsage(analyzerId: string, options?: AnalyzeWithUsageOptionalParams): PollerLike<OperationState_2<ContentAnalysisResult> & {
        readonly usage?: UsageDetails;
    }, ContentAnalysisResult>;
    getContentAnalysisStatus(operationId: string, options?: GetContentAnalysisStatusOptionalParams): Promise<ContentAnalysisStatus>;
}

export declare interface MetadataClientOptionalParams extends ClientOptions {
    apiVersion?: string;
}

export declare type OperationState = "NotStarted" | "Running" | "Succeeded" | "Failed" | "Canceled";

export { RestError }

export declare function restorePoller<TResponse extends PathUncheckedResponse, TResult, TState extends OperationState_2<TResult> = OperationState_2<TResult>>(client: MetadataClient, serializedState: string, sourceOperation: (...args: any[]) => PollerLike<TState, TResult>, options?: RestorePollerOptions<TResult>): PollerLike<TState, TResult>;

export declare interface RestorePollerOptions<TResult, TResponse extends PathUncheckedResponse = PathUncheckedResponse> extends OperationOptions {
    updateIntervalInMs?: number;
    abortSignal?: AbortSignalLike;
    processResponseBody?: (result: TResponse) => Promise<TResult>;
}

export declare interface UsageDetails {
    documentPagesBasic?: number;
    tokens?: Record<string, number>;
}

export { }
