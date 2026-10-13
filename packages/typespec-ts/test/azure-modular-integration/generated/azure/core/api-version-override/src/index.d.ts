import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';

export declare class ApiVersionOverrideClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(options?: ApiVersionOverrideClientOptionalParams);
    readonly legacyClient: LegacyClientOperations;
}

export declare interface ApiVersionOverrideClientOptionalParams extends ClientOptions {
    apiVersion?: string;
}

export { isRestError }

export declare enum KnownVersions {
    V20250101 = "2025-01-01"
}

export declare interface LegacyClientGetOptionalParams extends OperationOptions {
}

export declare interface LegacyClientOperations {
    get: (options?: LegacyClientGetOptionalParams) => Promise<void>;
}

export { RestError }

export { }
