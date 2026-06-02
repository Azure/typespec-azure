import { ClientOptions, OperationOptions } from "@azure-rest/core-client";
import { isRestError, Pipeline, RestError } from "@azure/core-rest-pipeline";

export declare interface GetOptionalParams extends OperationOptions {
  clientRequestId?: string;
}

export { isRestError };

export { RestError };

export declare class XmsClientRequestIdClient {
  private _client;
  readonly pipeline: Pipeline;
  constructor(options?: XmsClientRequestIdClientOptionalParams);
  get(options?: GetOptionalParams): Promise<void>;
}

export declare interface XmsClientRequestIdClientOptionalParams extends ClientOptions {}

export {};
