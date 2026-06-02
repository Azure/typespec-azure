import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

declare function createClient({ apiVersion, ...options }?: PathClientOptions): PathClient;
export default createClient;

export { isRestError };

export declare interface PathApiVersion {
  post(options?: PathApiVersionParameters): StreamableMethod<PathApiVersion200Response>;
}

export declare interface PathApiVersion200Response extends HttpResponse {
  status: "200";
}

export declare type PathApiVersionParameters = RequestParameters;

export declare type PathClient = Client & {
  path: Routes;
};

export declare interface PathClientOptions extends ClientOptions {
  apiVersion?: string;
}

export { RestError };

export declare interface Routes {
  (
    path: "/azure/client-generator-core/api-version/path/{version}",
    version: string,
  ): PathApiVersion;
}

export {};
