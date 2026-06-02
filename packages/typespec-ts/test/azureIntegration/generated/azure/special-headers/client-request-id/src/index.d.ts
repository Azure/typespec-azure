import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import type { RawHttpHeadersInput } from "@azure/core-rest-pipeline";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

declare function createClient(options?: XmsClientRequestIdClientOptions): XmsClientRequestIdClient;
export default createClient;

export declare interface Get {
  get(options?: GetParameters): StreamableMethod<Get204Response>;
}

export declare interface Get204Response extends HttpResponse {
  status: "204";
}

export declare interface GetHeaderParam {
  headers?: RawHttpHeadersInput & GetHeaders;
}

export declare interface GetHeaders {
  "x-ms-client-request-id"?: string;
}

export declare type GetParameters = GetHeaderParam & RequestParameters;

export { isRestError };

export { RestError };

export declare interface Routes {
  (path: "/azure/special-headers/x-ms-client-request-id/"): Get;
}

export declare type XmsClientRequestIdClient = Client & {
  path: Routes;
};

export declare interface XmsClientRequestIdClientOptions extends ClientOptions {}

export {};
