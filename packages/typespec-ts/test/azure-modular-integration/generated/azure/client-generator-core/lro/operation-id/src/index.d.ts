import { AbortSignalLike } from '@azure/abort-controller';
import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { OperationState as OperationState_2 } from '@azure/core-lro';
import { PathUncheckedResponse } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { PollerLike } from '@azure/core-lro';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface AnalyzeOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface DocumentAnalysisResult {
    summary: string;
}

export declare interface DocumentAnalysisStatus {
    status: OperationState;
    result?: DocumentAnalysisResult;
}

export declare interface GetDocumentAnalysisStatusOptionalParams extends OperationOptions {
}

export declare interface GetTranslationStatusOptionalParams extends OperationOptions {
}

export declare interface GetTranslationWithPathStatusOptionalParams extends OperationOptions {
}

export { isRestError }

export declare enum KnownVersions {
    V20221201Preview = "2022-12-01-preview"
}

export declare class OperationIdClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: OperationIdClientOptionalParams);
    startTranslationWithPath(options?: StartTranslationWithPathOptionalParams): PollerLike<OperationState_2<TranslationResult> & {
        readonly operationId?: string;
    }, TranslationResult>;
    getTranslationWithPathStatus(operationId: string, options?: GetTranslationWithPathStatusOptionalParams): Promise<TranslationWithPathStatus>;
    startTranslation(options?: StartTranslationOptionalParams): PollerLike<OperationState_2<TranslationResult> & {
        readonly operationId?: string;
    }, TranslationResult>;
    getTranslationStatus(options?: GetTranslationStatusOptionalParams): Promise<TranslationStatus>;
    analyze(modelId: string, options?: AnalyzeOptionalParams): PollerLike<OperationState_2<DocumentAnalysisResult> & {
        readonly operationId?: string;
    }, DocumentAnalysisResult>;
    getDocumentAnalysisStatus(modelId: string, resultId: string, options?: GetDocumentAnalysisStatusOptionalParams): Promise<DocumentAnalysisStatus>;
}

export declare interface OperationIdClientOptionalParams extends ClientOptions {
    apiVersion?: string;
}

export declare type OperationState = "NotStarted" | "Running" | "Succeeded" | "Failed" | "Canceled";

export { RestError }

export declare function restorePoller<TResponse extends PathUncheckedResponse, TResult, TState extends OperationState_2<TResult> = OperationState_2<TResult>>(client: OperationIdClient, serializedState: string, sourceOperation: (...args: any[]) => PollerLike<TState, TResult>, options?: RestorePollerOptions<TResult>): PollerLike<TState, TResult>;

export declare interface RestorePollerOptions<TResult, TResponse extends PathUncheckedResponse = PathUncheckedResponse> extends OperationOptions {
    updateIntervalInMs?: number;
    abortSignal?: AbortSignalLike;
    processResponseBody?: (result: TResponse) => Promise<TResult>;
}

export declare interface StartTranslationOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface StartTranslationWithPathOptionalParams extends OperationOptions {
    updateIntervalInMs?: number;
}

export declare interface TranslationResult {
    translatedCharacters: number;
}

export declare interface TranslationStatus {
    id: string;
    status: OperationState;
    result?: TranslationResult;
}

export declare interface TranslationWithPathStatus {
    id: string;
    status: OperationState;
    result?: TranslationResult;
}

export { }
