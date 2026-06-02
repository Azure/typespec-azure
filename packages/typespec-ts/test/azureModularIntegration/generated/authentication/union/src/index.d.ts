import { ClientOptions, OperationOptions } from "@azure-rest/core-client";
import { KeyCredential, TokenCredential } from "@azure/core-auth";
import { isRestError, Pipeline, RestError } from "@azure/core-rest-pipeline";

export { isRestError };

export { RestError };

export declare class UnionClient {
  private _client;
  readonly pipeline: Pipeline;
  constructor(credential: KeyCredential | TokenCredential, options?: UnionClientOptionalParams);
  validToken(options?: ValidTokenOptionalParams): Promise<void>;
  validKey(options?: ValidKeyOptionalParams): Promise<void>;
}

export declare interface UnionClientOptionalParams extends ClientOptions {}

export declare interface ValidKeyOptionalParams extends OperationOptions {}

export declare interface ValidTokenOptionalParams extends OperationOptions {}

export {};
