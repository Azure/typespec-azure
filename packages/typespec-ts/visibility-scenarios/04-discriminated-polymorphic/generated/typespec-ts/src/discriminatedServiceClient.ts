// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  DiscriminatedServiceContext,
  DiscriminatedServiceClientOptionalParams,
  createDiscriminatedService,
} from "./api/index.js";
import { createPet, createCat } from "./api/operations.js";
import { CreatePetOptionalParams, CreateCatOptionalParams } from "./api/options.js";
import { Cat, PetUnion, PetCreateUnion, CatCreate } from "./models/models.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { DiscriminatedServiceClientOptionalParams } from "./api/discriminatedServiceContext.js";

export class DiscriminatedServiceClient {
  private _client: DiscriminatedServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpointParam: string, options: DiscriminatedServiceClientOptionalParams = {}) {
    this._client = createDiscriminatedService(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /** Create a pet. POST -> Create; body should project to PetCreate. */
  createPet(
    body: PetCreateUnion,
    options: CreatePetOptionalParams = { requestOptions: {} },
  ): Promise<PetUnion> {
    return createPet(this._client, body, options);
  }

  /**
   * Create a cat directly (body is the `Cat` subtype, not the `Pet` base). This is
   * declared *before* `createPet` so the subtype is projected directly first: the
   * pre-pass must still route `Cat` through the whole `Pet` hierarchy and reuse the
   * single re-parented `CatCreate` clone, rather than emitting a duplicate.
   */
  createCat(
    body: CatCreate,
    options: CreateCatOptionalParams = { requestOptions: {} },
  ): Promise<Cat> {
    return createCat(this._client, body, options);
  }
}
