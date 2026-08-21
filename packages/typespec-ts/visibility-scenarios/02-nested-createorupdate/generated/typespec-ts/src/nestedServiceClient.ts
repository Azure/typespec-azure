// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  NestedServiceContext,
  NestedServiceClientOptionalParams,
  createNestedService,
} from "./api/index.js";
import { createC, createOrUpdateA } from "./api/operations.js";
import { CreateCOptionalParams, CreateOrUpdateAOptionalParams } from "./api/options.js";
import { A, C, ACreateOrUpdate, CCreate } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { NestedServiceClientOptionalParams } from "./api/nestedServiceContext.js";

export class NestedServiceClient {
  private _client: NestedServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: NestedServiceClientOptionalParams = {}) {
    this._client = createNestedService(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /**
   * Create C. C's own properties are all writable, but its nested D has a read-only
   * property. This tests whether CCreate is still synthesized purely because a
   * nested model must change.
   */
  createC(body: CCreate, options: CreateCOptionalParams = { requestOptions: {} }): Promise<C> {
    return createC(this._client, body, options);
  }

  /**
   * Create or update A. PUT resolves to Create|Update, so the body is projected to
   * ACreateOrUpdate, and the nested B is projected recursively to BCreateOrUpdate.
   */
  createOrUpdateA(
    body: ACreateOrUpdate,
    options: CreateOrUpdateAOptionalParams = { requestOptions: {} },
  ): Promise<A> {
    return createOrUpdateA(this._client, body, options);
  }
}
