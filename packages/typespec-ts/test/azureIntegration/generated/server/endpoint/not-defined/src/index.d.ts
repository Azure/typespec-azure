import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

declare function createClient(
  endpointParam: string,
  options?: NotDefinedParamInServerEndpointClientOptions,
): NotDefinedParamInServerEndpointClient;
export default createClient;

export { isRestError };

export declare type NotDefinedParamInServerEndpointClient = Client & {
  path: Routes;
};

export declare interface NotDefinedParamInServerEndpointClientOptions extends ClientOptions {}

export { RestError };

export declare interface Routes {
  (path: "/server/endpoint/not-defined/valid"): Valid;
}

export declare interface Valid {
  head(options?: ValidParameters): StreamableMethod<Valid200Response>;
}

export declare interface Valid200Response extends HttpResponse {
  status: "200";
}

export declare type ValidParameters = RequestParameters;

export {};
