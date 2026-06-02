import { ClientOptions, OperationOptions } from "@azure-rest/core-client";
import { isRestError, Pipeline, RestError } from "@azure/core-rest-pipeline";

export { isRestError };

export declare enum KnownApiVersions {
  V20250101 = "2025-01-01",
}

export declare interface QueryApiVersionOptionalParams extends OperationOptions {}

export declare class QueryClient {
  private _client;
  readonly pipeline: Pipeline;
  constructor(options?: QueryClientOptionalParams);
  queryApiVersion(options?: QueryApiVersionOptionalParams): Promise<void>;
}

export declare interface QueryClientOptionalParams extends ClientOptions {
  version?: string;
}

export { RestError };

export {};
