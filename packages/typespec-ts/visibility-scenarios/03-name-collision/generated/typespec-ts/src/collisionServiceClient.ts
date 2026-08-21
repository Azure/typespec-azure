// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  CollisionServiceContext,
  CollisionServiceClientOptionalParams,
  createCollisionService,
} from "./api/index.js";
import { createOther, createWidget } from "./api/operations.js";
import { CreateOtherOptionalParams, CreateWidgetOptionalParams } from "./api/options.js";
import { Widget, WidgetCreate, WidgetCreate_1 } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { CollisionServiceClientOptionalParams } from "./api/collisionServiceContext.js";

export class CollisionServiceClient {
  private _client: CollisionServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: CollisionServiceClientOptionalParams = {}) {
    this._client = createCollisionService(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /** An operation that uses the user-declared `WidgetCreate` as both body and response. */
  createOther(
    body: WidgetCreate,
    options: CreateOtherOptionalParams = { requestOptions: {} },
  ): Promise<WidgetCreate> {
    return createOther(this._client, body, options);
  }

  /** Create a widget. Body `Widget` -> synthesized `WidgetCreate` (collides with the user model). */
  createWidget(
    body: WidgetCreate_1,
    options: CreateWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return createWidget(this._client, body, options);
  }
}
