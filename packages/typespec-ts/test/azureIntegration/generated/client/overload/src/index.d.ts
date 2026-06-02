import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

declare function createClient(options?: OverloadClientOptions): OverloadClient;
export default createClient;

export { isRestError };

export declare interface List {
  get(options?: ListParameters): StreamableMethod<List200Response>;
}

export declare interface List200Response extends HttpResponse {
  status: "200";
  body: Array<ResourceOutput>;
}

export declare interface ListByScope {
  get(options?: ListByScopeParameters): StreamableMethod<ListByScope200Response>;
}

export declare interface ListByScope200Response extends HttpResponse {
  status: "200";
  body: Array<ResourceOutput>;
}

export declare type ListByScopeParameters = RequestParameters;

export declare type ListParameters = RequestParameters;

export declare type OverloadClient = Client & {
  path: Routes;
};

export declare interface OverloadClientOptions extends ClientOptions {}

export declare interface ResourceOutput {
  id: string;
  name: string;
  scope: string;
}

export { RestError };

export declare interface Routes {
  (path: "/client/overload/resources"): List;
  (path: "/client/overload/resources/{scope}", scope: string): ListByScope;
}

export {};
