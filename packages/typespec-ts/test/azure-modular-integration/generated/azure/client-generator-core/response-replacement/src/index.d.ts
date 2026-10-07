import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface BytesResponseOptionalParams extends OperationOptions {
}

export declare type BytesResponseResponse = {
    body: Uint8Array;
};

export { isRestError }

export declare class ResponseReplacementClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ResponseReplacementClientOptionalParams);
    bytesResponse(options?: BytesResponseOptionalParams): Promise<BytesResponseResponse>;
    voidResponse(options?: VoidResponseOptionalParams): Promise<void>;
}

export declare interface ResponseReplacementClientOptionalParams extends ClientOptions {
}

export { RestError }

export declare interface VoidResponseOptionalParams extends OperationOptions {
}

export declare interface Widget {
    name: string;
}

export { }
