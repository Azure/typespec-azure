import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface BlobLayout {
    content: string;
}

export declare class BodyOrNoContentClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: BodyOrNoContentClientOptionalParams);
    getNoContent(options?: GetNoContentOptionalParams): Promise<BlobLayout | void>;
    getBody(options?: GetBodyOptionalParams): Promise<BlobLayout | void>;
}

export declare interface BodyOrNoContentClientOptionalParams extends ClientOptions {
}

export declare interface GetBodyOptionalParams extends OperationOptions {
}

export declare interface GetNoContentOptionalParams extends OperationOptions {
}

export { isRestError }

export { RestError }

export { }
