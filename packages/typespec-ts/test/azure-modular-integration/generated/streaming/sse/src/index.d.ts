import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { NodeReadableStream } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare type DataEvents = {
    contents: string;
} | {
    metadata: Record<string, string>;
    contents: string;
};

export declare interface DataOperations {
    withoutEnvelope: (options?: DataWithoutEnvelopeOptionalParams) => Promise<AsyncIterable<{
        event: "withEnvelope";
        data: string;
    } | {
        event: "withoutEnvelope";
        data: {
            metadata: Record<string, string>;
            contents: string;
        };
    }>>;
    withEnvelope: (options?: DataWithEnvelopeOptionalParams) => Promise<AsyncIterable<{
        event: "withEnvelope";
        data: string;
    } | {
        event: "withoutEnvelope";
        data: {
            metadata: Record<string, string>;
            contents: string;
        };
    }>>;
}

export declare interface DataWithEnvelopeOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type DataWithEnvelopeResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface DataWithoutEnvelopeOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type DataWithoutEnvelopeResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface FinalResult {
    references: string[];
}

export declare interface Info {
    desc: string;
}

export { isRestError }

export declare interface NamedOperations {
    receive: (options?: NamedReceiveOptionalParams) => Promise<AsyncIterable<{
        event: "responseCreated";
        data: ResponseCreated;
    } | {
        event: "responseDelta";
        data: ResponseDelta;
    }>>;
}

export declare interface NamedReceiveOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type NamedReceiveResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface PartialResult {
    text: string;
}

export declare type ProtocolEvents = ProtocolInfo;

export declare interface ProtocolIdOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type ProtocolIdResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface ProtocolInfo {
    message: string;
}

export declare interface ProtocolInvalidIdOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type ProtocolInvalidIdResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface ProtocolInvalidRetryOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type ProtocolInvalidRetryResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface ProtocolOperations {
    reconnect: (options?: ProtocolReconnectOptionalParams) => Promise<AsyncIterable<{
        event: "message";
        data: ProtocolInfo;
    }>>;
    invalidRetry: (options?: ProtocolInvalidRetryOptionalParams) => Promise<AsyncIterable<{
        event: "message";
        data: ProtocolInfo;
    }>>;
    retry: (options?: ProtocolRetryOptionalParams) => Promise<AsyncIterable<{
        event: "message";
        data: ProtocolInfo;
    }>>;
    invalidId: (options?: ProtocolInvalidIdOptionalParams) => Promise<AsyncIterable<{
        event: "message";
        data: ProtocolInfo;
    }>>;
    id: (options?: ProtocolIdOptionalParams) => Promise<AsyncIterable<{
        event: "message";
        data: ProtocolInfo;
    }>>;
}

export declare interface ProtocolReconnectOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type ProtocolReconnectResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface ProtocolRetryOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type ProtocolRetryResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface ResponseCreated {
    id: string;
}

export declare interface ResponseDelta {
    delta: string;
}

export declare type ResponseEvents = ResponseCreated | ResponseDelta | "[DONE]";

export { RestError }

export declare type RetrievalEvents = PartialResult | FinalResult | "[DONE]";

export declare interface RetrievalRequest {
    query: string;
}

export declare interface RetrieveOperations {
    stream: (request: RetrievalRequest, options?: RetrieveStreamOptionalParams) => Promise<AsyncIterable<{
        event: "partialResult";
        data: PartialResult;
    } | {
        event: "finalResult";
        data: FinalResult;
    }>>;
}

export declare interface RetrieveStreamOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type RetrieveStreamResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare class SseClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: SseClientOptionalParams);
    readonly data: DataOperations;
    readonly protocol: ProtocolOperations;
    readonly retrieve: RetrieveOperations;
    readonly named: NamedOperations;
    readonly unnamed: UnnamedOperations;
}

export declare interface SseClientOptionalParams extends ClientOptions {
}

export declare type UnnamedEvents = Info;

export declare interface UnnamedOperations {
    receive: (options?: UnnamedReceiveOptionalParams) => Promise<AsyncIterable<Info>>;
}

export declare interface UnnamedReceiveOptionalParams extends OperationOptions {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
}

export declare type UnnamedReceiveResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export { }
