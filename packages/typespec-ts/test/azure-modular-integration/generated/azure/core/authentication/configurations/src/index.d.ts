import { ClientOptions } from '@azure-rest/core-client';
import { isRestError } from '@azure/core-rest-pipeline';
import { OperationOptions } from '@azure-rest/core-client';
import { Pipeline } from '@azure/core-rest-pipeline';
import { RestError } from '@azure/core-rest-pipeline';
import { TokenCredential } from '@azure/core-auth';

export declare class ConfigurationsClient {
    private _client;
    readonly pipeline: Pipeline;
    constructor(credential: TokenCredential, options?: ConfigurationsClientOptionalParams);
    governmentConfiguration(options?: GovernmentConfigurationOptionalParams): Promise<void>;
    defaultConfiguration(options?: DefaultConfigurationOptionalParams): Promise<void>;
}

export declare interface ConfigurationsClientOptionalParams extends ClientOptions {
    serviceConfiguration?: ConfigurationsClientServiceConfiguration;
    audience?: string;
}

export declare type ConfigurationsClientServiceConfiguration = "public" | "government";

export declare interface DefaultConfigurationOptionalParams extends OperationOptions {
}

export declare interface GovernmentConfigurationOptionalParams extends OperationOptions {
}

export { isRestError }

export declare enum KnownConfigurationsAudience {
    Public = "https://api.loganalytics.io",
    Government = "https://api.loganalytics.us"
}

export { RestError }

export { }
