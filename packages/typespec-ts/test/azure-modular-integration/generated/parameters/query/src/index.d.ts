import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare interface ConstantOperations {
    post: (options?: ConstantPostOptionalParams) => Promise<void>;
}

export declare interface ConstantPostOptionalParams extends OperationOptions {
}

export { isRestError }

export declare class QueryClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: QueryClientOptionalParams);
    readonly specialChar: SpecialCharOperations;
    readonly constant: ConstantOperations;
}

export declare interface QueryClientOptionalParams extends ClientOptions {
}

export { RestError }

export declare interface SpecialCharDollarSignOptionalParams extends OperationOptions {
}

export declare interface SpecialCharOperations {
    dollarSign: (filter: string, options?: SpecialCharDollarSignOptionalParams) => Promise<void>;
}

export { }
