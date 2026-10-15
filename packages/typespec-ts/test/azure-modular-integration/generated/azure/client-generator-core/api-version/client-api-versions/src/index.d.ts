import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare class ClientApiVersionsClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ClientApiVersionsClientOptionalParams);
    sendApiVersion(options?: SendApiVersionOptionalParams): Promise<void>;
}

export declare interface ClientApiVersionsClientOptionalParams extends ClientOptions {
    apiVersion?: string;
}

export { isRestError }

export declare enum KnownClientApiVersions {
    V20221001 = "2022-10-01",
    V20240101 = "2024-01-01"
}

export { RestError }

export declare interface SendApiVersionOptionalParams extends OperationOptions {
}

export { }
