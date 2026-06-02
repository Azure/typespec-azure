import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import type { RawHttpHeaders } from "@azure/core-rest-pipeline";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

declare function createClient(
  endpointParam: string,
  options?: VersioningReturnTypeChangedFromClientOptions,
): VersioningReturnTypeChangedFromClient;
export default createClient;

export { isRestError };

export { RestError };

export declare interface Routes {
  (path: "/test"): Test;
}

export declare interface Test {
  post(options: TestParameters): StreamableMethod<Test200Response>;
}

export declare interface Test200Headers {
  "content-type": "application/json";
}

export declare interface Test200Response extends HttpResponse {
  status: "200";
  body: string;
  headers: RawHttpHeaders & Test200Headers;
}

export declare interface TestBodyParam {
  body: string;
}

export declare interface TestMediaTypesParam {
  contentType: "application/json";
}

export declare type TestParameters = TestMediaTypesParam & TestBodyParam & RequestParameters;

export declare type VersioningReturnTypeChangedFromClient = Client & {
  path: Routes;
};

export declare interface VersioningReturnTypeChangedFromClientOptions extends ClientOptions {
  version?: Versions;
}

export declare type Versions = "v1" | "v2";

export {};
