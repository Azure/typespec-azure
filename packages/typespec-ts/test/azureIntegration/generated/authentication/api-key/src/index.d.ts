import type {
  Client,
  ClientOptions,
  HttpResponse,
  RequestParameters,
  StreamableMethod,
} from "@azure-rest/core-client";
import type { KeyCredential } from "@azure/core-auth";
import { isRestError, RestError } from "@azure/core-rest-pipeline";

export declare type AuthApiKeyClient = Client & {
  path: Routes;
};

export declare interface AuthApiKeyClientOptions extends ClientOptions {}

declare function createClient(
  credentials: KeyCredential,
  options?: AuthApiKeyClientOptions,
): AuthApiKeyClient;
export default createClient;

export declare interface Invalid {
  get(options?: InvalidParameters): StreamableMethod<Invalid204Response | Invalid403Response>;
}

export declare interface Invalid204Response extends HttpResponse {
  status: "204";
}

export declare interface Invalid403Response extends HttpResponse {
  status: "403";
  body: InvalidAuthOutput;
}

export declare interface InvalidAuthOutput {
  error: string;
}

export declare type InvalidParameters = RequestParameters;

export { isRestError };

export { RestError };

export declare interface Routes {
  (path: "/authentication/api-key/valid"): Valid;
  (path: "/authentication/api-key/invalid"): Invalid;
}

export declare interface Valid {
  get(options?: ValidParameters): StreamableMethod<Valid204Response>;
}

export declare interface Valid204Response extends HttpResponse {
  status: "204";
}

export declare type ValidParameters = RequestParameters;

export {};
