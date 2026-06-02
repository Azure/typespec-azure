import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import type { RawHttpHeadersInput } from "@azure/core-rest-pipeline";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

export declare interface ActionRequest {
  stringProperty: string;
  modelProperty?: Model;
  arrayProperty?: string[];
  recordProperty?: Record<string, string>;
}

export declare interface ActionResponseOutput {
  stringProperty: string;
  modelProperty?: ModelOutput;
  arrayProperty?: string[];
  recordProperty?: Record<string, string>;
}

export declare interface Basic {
  post(
    options: ServiceOperationGroupBasicParameters,
  ): StreamableMethod<ServiceOperationGroupBasic200Response>;
}

export declare type BasicClient = Client & {
  path: Routes;
};

export declare interface BasicClientOptions extends ClientOptions {
  apiVersion?: string;
}

declare function createClient({ apiVersion, ...options }?: BasicClientOptions): BasicClient;
export default createClient;

export declare type Enum = string;

export declare type EnumOutput = string;

export { isRestError };

export declare interface Model {
  int32Property?: number;
  float32Property?: number;
  enumProperty?: Enum;
}

export declare interface ModelOutput {
  int32Property?: number;
  float32Property?: number;
  enumProperty?: EnumOutput;
}

export { RestError };

export declare interface Routes {
  (path: "/azure/example/basic/basic"): Basic;
}

export declare interface ServiceOperationGroupBasic200Response extends HttpResponse {
  status: "200";
  body: ActionResponseOutput;
}

export declare interface ServiceOperationGroupBasicBodyParam {
  body: ActionRequest;
}

export declare interface ServiceOperationGroupBasicHeaderParam {
  headers: RawHttpHeadersInput & ServiceOperationGroupBasicHeaders;
}

export declare interface ServiceOperationGroupBasicHeaders {
  "header-param": string;
}

export declare type ServiceOperationGroupBasicParameters = ServiceOperationGroupBasicQueryParam &
  ServiceOperationGroupBasicHeaderParam &
  ServiceOperationGroupBasicBodyParam &
  RequestParameters;

export declare interface ServiceOperationGroupBasicQueryParam {
  queryParameters: ServiceOperationGroupBasicQueryParamProperties;
}

export declare interface ServiceOperationGroupBasicQueryParamProperties {
  "query-param": string;
}

export {};
