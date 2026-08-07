// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { NestedServiceContext as Client } from "./index.js";
import {
  A,
  aDeserializer,
  C,
  cDeserializer,
  ACreateOrUpdate,
  aCreateOrUpdateSerializer,
  CCreate,
  cCreateSerializer,
} from "../models/models.js";
import { CreateCOptionalParams, CreateOrUpdateAOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createCSend(
  context: Client,
  body: CCreate,
  options: CreateCOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/cs")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: cCreateSerializer(body),
    });
}

export async function _createCDeserialize(result: PathUncheckedResponse): Promise<C> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return cDeserializer(result.body);
}
/**
 * Create C. C's own properties are all writable, but its nested D has a read-only
 * property. This tests whether CCreate is still synthesized purely because a
 * nested model must change.
 */
export async function createC(
  context: Client,
  body: CCreate,
  options: CreateCOptionalParams = { requestOptions: {} },
): Promise<C> {
  const result = await _createCSend(context, body, options);
  return _createCDeserialize(result);
}

export function _createOrUpdateASend(
  context: Client,
  body: ACreateOrUpdate,
  options: CreateOrUpdateAOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/as")
    .put({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: aCreateOrUpdateSerializer(body),
    });
}

export async function _createOrUpdateADeserialize(result: PathUncheckedResponse): Promise<A> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return aDeserializer(result.body);
}
/**
 * Create or update A. PUT resolves to Create|Update, so the body is projected to
 * ACreateOrUpdate, and the nested B is projected recursively to BCreateOrUpdate.
 */
export async function createOrUpdateA(
  context: Client,
  body: ACreateOrUpdate,
  options: CreateOrUpdateAOptionalParams = { requestOptions: {} },
): Promise<A> {
  const result = await _createOrUpdateASend(context, body, options);
  return _createOrUpdateADeserialize(result);
}
