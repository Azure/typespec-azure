import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

declare function createClient(options?: DurationClientOptions): DurationClient;
export default createClient;

export declare type DurationClient = Client & {
  path: Routes;
};

export declare interface DurationClientOptions extends ClientOptions {}

export declare interface DurationConstant {
  put(options: DurationConstantParameters): StreamableMethod<DurationConstant204Response>;
}

export declare interface DurationConstant204Response extends HttpResponse {
  status: "204";
}

export declare interface DurationConstantBodyParam {
  body: DurationModel;
}

export declare type DurationConstantParameters = DurationConstantBodyParam & RequestParameters;

export declare interface DurationModel {
  input: string;
}

export { isRestError };

export { RestError };

export declare interface Routes {
  (path: "/azure/encode/duration/duration-constant"): DurationConstant;
}

export {};
