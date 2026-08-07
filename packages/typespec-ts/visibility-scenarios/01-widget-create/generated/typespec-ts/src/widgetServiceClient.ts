// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  WidgetServiceContext,
  WidgetServiceClientOptionalParams,
  createWidgetService,
} from "./api/index.js";
import { createGadget, createWidget } from "./api/operations.js";
import { CreateGadgetOptionalParams, CreateWidgetOptionalParams } from "./api/options.js";
import { Widget, Gadget, WidgetCreate } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { WidgetServiceClientOptionalParams } from "./api/widgetServiceContext.js";

export class WidgetServiceClient {
  private _client: WidgetServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: WidgetServiceClientOptionalParams = {}) {
    this._client = createWidgetService(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /** Create a gadget. With no read-only props the write view collapses to the same model, so request and response share it. */
  createGadget(
    body: Gadget,
    options: CreateGadgetOptionalParams = { requestOptions: {} },
  ): Promise<Gadget> {
    return createGadget(this._client, body, options);
  }

  /** Create a widget. The POST body is projected to the Create visibility. */
  createWidget(
    body: WidgetCreate,
    options: CreateWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return createWidget(this._client, body, options);
  }
}
