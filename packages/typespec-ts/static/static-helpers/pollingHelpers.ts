import {
  OperationResponse,
  OperationState,
  PollerLike,
  ResourceLocationConfig,
  RunningOperation,
  createHttpPoller,
} from "@azure/core-lro";

import { Client, PathUncheckedResponse, createRestError } from "@azure-rest/core-client";
import { AbortSignalLike } from "@azure/abort-controller";

export interface GetLongRunningPollerOptions<TResponse> {
  /** Delay to wait until next poll, in milliseconds. */
  updateIntervalInMs?: number;
  /**
   * The signal which can be used to abort requests.
   */
  abortSignal?: AbortSignalLike;
  /**
   * The potential location of the result of the LRO if specified by the LRO extension in the swagger.
   */
  resourceLocationConfig?: ResourceLocationConfig;
  /**
   * The original url of the LRO
   * Should not be null when restoreFrom is set
   */
  initialRequestUrl?: string;
  /**
   * A serialized poller which can be used to resume an existing paused Long-Running-Operation.
   */
  restoreFrom?: string;
  /**
   * The function to get the initial response
   */
  getInitialResponse?: () => PromiseLike<TResponse>;
  /**
   * The api-version of the LRO
   */
  apiVersion?: string;
  /**
   * Extracts the operation metadata exposed on the operation state from the latest
   * status-monitor response and the current polling URL.
   */
  getOperationMetadata?: (
    statusMonitorResponse: TResponse | undefined,
    operationLocation: string | undefined,
  ) => Record<string, unknown>;
}
export function getLongRunningPoller<TResponse extends PathUncheckedResponse, TResult = void>(
  client: Client,
  processResponseBody: (result: TResponse) => Promise<TResult>,
  expectedStatuses: string[],
  options: GetLongRunningPollerOptions<TResponse>,
): PollerLike<OperationState<TResult>, TResult> {
  const { restoreFrom, getInitialResponse, apiVersion, getOperationMetadata } = options;
  if (!restoreFrom && !getInitialResponse) {
    throw new Error("Either restoreFrom or getInitialResponse must be specified");
  }
  let initialResponse: TResponse | undefined = undefined;
  // The latest status-monitor response, used to compute operation metadata. It is intentionally
  // not serialized so restored pollers refresh the metadata on their next poll.
  let statusMonitorResponse: TResponse | undefined = undefined;
  let lroPoller: PollerLike<OperationState<TResult>, TResult> | undefined = undefined;
  const pollAbortController = new AbortController();
  const poller: RunningOperation<TResponse> = {
    sendInitialRequest: async () => {
      if (!getInitialResponse) {
        throw new Error("getInitialResponse is required when initializing a new poller");
      }
      initialResponse = await getInitialResponse();
      const lroResponse = getLroResponse(initialResponse, expectedStatuses);
      if (getOperationMetadata && isObjectBody(initialResponse.body)) {
        statusMonitorResponse = initialResponse;
      }
      return lroResponse;
    },
    sendPollRequest: async (
      path: string,
      pollOptions?: {
        abortSignal?: AbortSignalLike;
      },
    ) => {
      // The poll request would both listen to the user provided abort signal and the poller's own abort signal
      function abortListener(): void {
        pollAbortController.abort();
      }
      const abortSignal = pollAbortController.signal;
      if (options.abortSignal?.aborted) {
        pollAbortController.abort();
      } else if (pollOptions?.abortSignal?.aborted) {
        pollAbortController.abort();
      } else if (!abortSignal.aborted) {
        options.abortSignal?.addEventListener("abort", abortListener, {
          once: true,
        });
        pollOptions?.abortSignal?.addEventListener("abort", abortListener, {
          once: true,
        });
      }
      let response;
      try {
        const pollingPath = apiVersion ? addApiVersionToUrl(path, apiVersion) : path;
        response = await client.pathUnchecked(pollingPath).get({ abortSignal });
      } finally {
        options.abortSignal?.removeEventListener("abort", abortListener);
        pollOptions?.abortSignal?.removeEventListener("abort", abortListener);
      }

      const lroResponse = getLroResponse(response as TResponse, expectedStatuses);
      // Only responses from the status monitor carry operation metadata, not the final resource.
      if (getOperationMetadata && path === getOperationLocation(lroPoller?.operationState)) {
        statusMonitorResponse = response as TResponse;
      }
      return lroResponse;
    },
  };
  lroPoller = createHttpPoller(poller, {
    intervalInMs: options?.updateIntervalInMs,
    resourceLocationConfig: options?.resourceLocationConfig,
    restoreFrom: options?.restoreFrom,
    processResult: (result: unknown) => {
      return processResponseBody(result as TResponse);
    },
    updateState: getOperationMetadata
      ? (state: OperationState<TResult>) => attachOperationMetadata(state)
      : undefined,
  });
  if (!getOperationMetadata) {
    return lroPoller;
  }

  let cachedMetadata:
    { response?: TResponse; location?: string; value: Record<string, unknown> } | undefined;
  function getMetadata(state: OperationState<TResult>): Record<string, unknown> {
    const location = getOperationLocation(state);
    if (
      !cachedMetadata ||
      cachedMetadata.response !== statusMonitorResponse ||
      cachedMetadata.location !== location
    ) {
      cachedMetadata = {
        response: statusMonitorResponse,
        location,
        value: getOperationMetadata!(statusMonitorResponse, location),
      };
    }
    return cachedMetadata.value;
  }
  const metadataKeys = Object.keys(getOperationMetadata(undefined, undefined));
  const statesWithMetadata = new WeakSet<object>();
  function attachOperationMetadata(state: OperationState<TResult> | undefined): void {
    if (!state || statesWithMetadata.has(state)) {
      return;
    }
    statesWithMetadata.add(state);
    for (const key of metadataKeys) {
      // Non-enumerable so the metadata is not persisted when the poller is serialized.
      Object.defineProperty(state, key, {
        get: () => getMetadata(state)[key],
        enumerable: false,
        configurable: true,
      });
    }
  }
  const getBaseOperationState = Object.getOwnPropertyDescriptor(lroPoller, "operationState")?.get;
  const pollerWithMetadata = lroPoller;
  Object.defineProperty(pollerWithMetadata, "operationState", {
    get: () => {
      const state = getBaseOperationState?.call(pollerWithMetadata) as
        OperationState<TResult> | undefined;
      attachOperationMetadata(state);
      return state;
    },
    enumerable: true,
    configurable: true,
  });
  return pollerWithMetadata;
}

/**
 * Gets the value of a path parameter from a URL by matching the URL path against a path template.
 * @param url - the URL to parse
 * @param pathTemplate - the path template, for example `/jobs/{jobId}`
 * @param parameterName - the name of the path parameter to get
 * @returns - the decoded path parameter value, or undefined if the URL does not match the template
 */
export function getPathParameterFromUrl(
  url: string | undefined,
  pathTemplate: string,
  parameterName: string,
): string | undefined {
  if (!url) {
    return undefined;
  }
  const parameterNames: string[] = [];
  const pattern = pathTemplate
    .split(/(\{[^}]+\})/)
    .map((part) => {
      const match = /^\{[+/;.?&#]?([^}*]+)\*?\}$/.exec(part);
      if (match) {
        parameterNames.push(match[1]!);
        return "([^/?#]+)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  // The base URL is only used for parsing relative URLs and won't affect the result
  const match = new RegExp(`${pattern}/?$`).exec(new URL(url, "https://microsoft.com").pathname);
  const parameterIndex = parameterNames.indexOf(parameterName);
  const value = parameterIndex < 0 ? undefined : match?.[parameterIndex + 1];
  if (value === undefined) {
    return undefined;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getOperationLocation(state: unknown): string | undefined {
  return (state as { config?: { operationLocation?: string } } | undefined)?.config
    ?.operationLocation;
}

function isObjectBody(body: unknown): boolean {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}
/**
 * Converts a Rest Client response to a response that the LRO implementation understands
 * @param response - a rest client http response
 * @param deserializeFn - deserialize function to convert Rest response to modular output
 * @returns - An LRO response that the LRO implementation understands
 */
function getLroResponse<TResponse extends PathUncheckedResponse>(
  response: TResponse,
  expectedStatuses: string[],
): OperationResponse<TResponse> {
  if (!expectedStatuses.includes(response.status)) {
    throw createRestError(response);
  }

  return {
    flatResponse: response,
    rawResponse: {
      ...response,
      statusCode: Number.parseInt(response.status),
      body: response.body,
    },
  };
}

/**
 * Adds the api-version query parameter on a URL if it's not present.
 * @param url - the URL to modify
 * @param apiVersion - the API version to set
 * @returns - the URL with the api-version query parameter set
 */
function addApiVersionToUrl(url: string, apiVersion: string): string {
  // The base URL is only used for parsing and won't appear in the returned URL
  const urlObj = new URL(url, "https://microsoft.com");
  if (!urlObj.searchParams.get("api-version")) {
    // Append one if there is no apiVersion
    return `${url}${urlObj.search ? "&" : "?"}api-version=${apiVersion}`;
  }
  return url;
}
