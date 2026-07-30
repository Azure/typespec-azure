// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  SpreadServiceContext,
  SpreadServiceClientOptionalParams,
  createSpreadService,
} from "./api/index.js";
import { createContainer, createWidget } from "./api/operations.js";
import { CreateContainerOptionalParams, CreateWidgetOptionalParams } from "./api/options.js";
import { Widget, DetailCreate, Container } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { SpreadServiceClientOptionalParams } from "./api/spreadServiceContext.js";

export class SpreadServiceClient {
  private _client: SpreadServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: SpreadServiceClientOptionalParams = {}) {
    this._client = createSpreadService(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /** Create a container with a spread body that nests a model property. */
  createContainer(
    title: string,
    detail: DetailCreate,
    options: CreateContainerOptionalParams = { requestOptions: {} },
  ): Promise<Container> {
    return createContainer(this._client, title, detail, options);
  }

  /** Create a widget with a spread body. */
  createWidget(
    displayName: string,
    weight: number,
    options: CreateWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return createWidget(this._client, displayName, weight, options);
  }
}
