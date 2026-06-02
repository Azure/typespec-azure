import { ClientOptions, OperationOptions } from "@azure-rest/core-client";
import { isRestError, Pipeline, RestError } from "@azure/core-rest-pipeline";

export declare interface ConstantOperations {
  post: (options?: ConstantPostOptionalParams) => Promise<void>;
}

export declare interface ConstantPostOptionalParams extends OperationOptions {}

export { isRestError };

export declare class QueryClient {
  private _client;
  readonly pipeline: Pipeline;
  constructor(options?: QueryClientOptionalParams);
  readonly constant: ConstantOperations;
}

export declare interface QueryClientOptionalParams extends ClientOptions {}

export { RestError };

export {};
