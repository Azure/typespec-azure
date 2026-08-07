// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  CyclicServiceContext,
  CyclicServiceClientOptionalParams,
  createCyclicService,
} from "./api/index.js";
import { createNode } from "./api/operations.js";
import { CreateNodeOptionalParams } from "./api/options.js";
import { Node, NodeCreate } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { CyclicServiceClientOptionalParams } from "./api/cyclicServiceContext.js";

export class CyclicServiceClient {
  private _client: CyclicServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: CyclicServiceClientOptionalParams = {}) {
    this._client = createCyclicService(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /** Create a node. POST -> Create; body projects to NodeCreate. */
  createNode(
    body: NodeCreate,
    options: CreateNodeOptionalParams = { requestOptions: {} },
  ): Promise<Node> {
    return createNode(this._client, body, options);
  }
}
