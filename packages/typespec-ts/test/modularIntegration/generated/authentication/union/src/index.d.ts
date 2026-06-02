import {
  ClientOptions,
  KeyCredential,
  OperationOptions,
  Pipeline,
  TokenCredential,
} from "@typespec/ts-http-runtime";

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
