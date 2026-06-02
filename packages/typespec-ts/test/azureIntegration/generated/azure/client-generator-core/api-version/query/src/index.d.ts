import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

declare function createClient({ apiVersion, ...options }?: QueryClientOptions): QueryClient;
export default createClient;

export { isRestError };

export declare interface QueryApiVersion {
  post(options?: QueryApiVersionParameters): StreamableMethod<QueryApiVersion200Response>;
}

export declare interface QueryApiVersion200Response extends HttpResponse {
  status: "200";
}

export declare type QueryApiVersionParameters = RequestParameters;

export declare type QueryClient = Client & {
  path: Routes;
};

export declare interface QueryClientOptions extends ClientOptions {
  apiVersion?: string;
}

export { RestError };

export declare interface Routes {
  (path: "/azure/client-generator-core/api-version/query"): QueryApiVersion;
}

export {};
