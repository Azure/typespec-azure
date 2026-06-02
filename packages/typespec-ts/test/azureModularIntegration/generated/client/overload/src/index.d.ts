import { ClientOptions, OperationOptions } from "@azure-rest/core-client";
import { isRestError, Pipeline, RestError } from "@azure/core-rest-pipeline";

export { isRestError };

export declare interface ListByScopeOptionalParams extends OperationOptions {}

export declare interface ListOptionalParams extends OperationOptions {}

export declare class OverloadClient {
  private _client;
  readonly pipeline: Pipeline;
  constructor(options?: OverloadClientOptionalParams);
  listByScope(scope: string, options?: ListByScopeOptionalParams): Promise<Resource[]>;
  list(options?: ListOptionalParams): Promise<Resource[]>;
}

export declare interface OverloadClientOptionalParams extends ClientOptions {}

export declare interface Resource {
  id: string;
  name: string;
  scope: string;
}

export { RestError };

export {};
