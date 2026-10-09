import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare class BodyRootClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: BodyRootClientOptionalParams);
    nested(body: {
        bodyRootParameters: BodyRootModel;
    }, options?: NestedOptionalParams): Promise<void>;
}

export declare interface BodyRootClientOptionalParams extends ClientOptions {
}

export declare interface BodyRootModel {
    category?: string;
    linkType?: string;
    wasSuccessful?: boolean;
}

export { isRestError }

export declare interface NestedOptionalParams extends OperationOptions {
}

export { RestError }

export { }
