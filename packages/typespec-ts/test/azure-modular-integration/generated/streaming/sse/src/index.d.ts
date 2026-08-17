import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { NodeReadableStream } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface FinalResult {
    references: string[];
}

export declare interface Info {
    desc: string;
}

export { isRestError }

export declare interface NamedOperations {
    receive: (options?: NamedReceiveOptionalParams) => Promise<AsyncIterable<ResponseCreated | ResponseDelta>>;
}

export declare interface NamedReceiveOptionalParams extends OperationOptions {
}

export declare type NamedReceiveResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare interface PartialResult {
    text: string;
}

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
    stream: (request: RetrievalRequest, options?: RetrieveStreamOptionalParams) => Promise<AsyncIterable<PartialResult | FinalResult>>;
}

export declare interface RetrieveStreamOptionalParams extends OperationOptions {
}

export declare type RetrieveStreamResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export declare class SseClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: SseClientOptionalParams);
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
}

export declare type UnnamedReceiveResponse = {
    blobBody?: Promise<Blob>;
    readableStreamBody?: NodeReadableStream;
};

export { }
