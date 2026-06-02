import { ClientOptions, OperationOptions } from "@azure-rest/core-client";
import { TokenCredential } from "@azure/core-auth";
import { isRestError, Pipeline, RestError } from "@azure/core-rest-pipeline";

export declare interface InvalidAuth {
  error: string;
}

export declare interface InvalidOptionalParams extends OperationOptions {}

export { isRestError };

export declare class OAuth2Client {
  private _client;
  readonly pipeline: Pipeline;
  constructor(credential: TokenCredential, options?: OAuth2ClientOptionalParams);
  invalid(options?: InvalidOptionalParams): Promise<void>;
  valid(options?: ValidOptionalParams): Promise<void>;
}

export declare interface OAuth2ClientOptionalParams extends ClientOptions {}

export { RestError };

export declare interface ValidOptionalParams extends OperationOptions {}

export {};
