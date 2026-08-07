// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { DiscriminatedServiceContext as Client } from "./index.js";
import {
  Cat,
  catDeserializer,
  petUnionDeserializer,
  PetUnion,
  petCreateUnionSerializer,
  PetCreateUnion,
  CatCreate,
  catCreateSerializer,
} from "../models/models.js";
import { CreatePetOptionalParams, CreateCatOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createPetSend(
  context: Client,
  body: PetCreateUnion,
  options: CreatePetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/pets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: petCreateUnionSerializer(body),
    });
}

export async function _createPetDeserialize(result: PathUncheckedResponse): Promise<PetUnion> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petUnionDeserializer(result.body);
}
/** Create a pet. POST -> Create; body should project to PetCreate. */
export async function createPet(
  context: Client,
  body: PetCreateUnion,
  options: CreatePetOptionalParams = { requestOptions: {} },
): Promise<PetUnion> {
  const result = await _createPetSend(context, body, options);
  return _createPetDeserialize(result);
}

export function _createCatSend(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/cats")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: catCreateSerializer(body),
    });
}

export async function _createCatDeserialize(result: PathUncheckedResponse): Promise<Cat> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return catDeserializer(result.body);
}
/**
 * Create a cat directly (body is the `Cat` subtype, not the `Pet` base). This is
 * declared *before* `createPet` so the subtype is projected directly first: the
 * pre-pass must still route `Cat` through the whole `Pet` hierarchy and reuse the
 * single re-parented `CatCreate` clone, rather than emitting a duplicate.
 */
export async function createCat(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): Promise<Cat> {
  const result = await _createCatSend(context, body, options);
  return _createCatDeserialize(result);
}
