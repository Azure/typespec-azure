// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  ContentNegotiationContext,
  ContentNegotiationClientOptionalParams,
  createContentNegotiation,
} from "./api/index.js";
import {
  SameBodySingleOperationOperations,
  _getSameBodySingleOperationOperations,
} from "./classic/sameBodySingleOperation/index.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { ContentNegotiationClientOptionalParams } from "./api/contentNegotiationContext.js";

export class ContentNegotiationClient {
  private _client: ContentNegotiationContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: ContentNegotiationClientOptionalParams = {}) {
    const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
    const userAgentPrefix = prefixFromOptions
      ? `${prefixFromOptions} azsdk-js-client`
      : `azsdk-js-client`;
    this._client = createContentNegotiation(endpointParam, {
      ...options,
      userAgentOptions: { userAgentPrefix },
    });
    this.pipeline = this._client.pipeline;
    this.sameBodySingleOperation = _getSameBodySingleOperationOperations(this._client);
  }

  /** The operation groups for sameBodySingleOperation */
  public readonly sameBodySingleOperation: SameBodySingleOperationOperations;
}
