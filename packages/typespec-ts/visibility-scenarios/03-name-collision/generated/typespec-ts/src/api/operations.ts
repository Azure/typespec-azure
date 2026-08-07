// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CollisionServiceContext as Client } from "./index.js";
import {
  Widget,
  widgetDeserializer,
  WidgetCreate,
  widgetCreateSerializer,
  widgetCreateDeserializer,
  WidgetCreate_1,
  widgetCreateSerializer_1,
} from "../models/models.js";
import { CreateOtherOptionalParams, CreateWidgetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createOtherSend(
  context: Client,
  body: WidgetCreate,
  options: CreateOtherOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/others")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: widgetCreateSerializer(body),
    });
}

export async function _createOtherDeserialize(
  result: PathUncheckedResponse,
): Promise<WidgetCreate> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetCreateDeserializer(result.body);
}
/** An operation that uses the user-declared `WidgetCreate` as both body and response. */
export async function createOther(
  context: Client,
  body: WidgetCreate,
  options: CreateOtherOptionalParams = { requestOptions: {} },
): Promise<WidgetCreate> {
  const result = await _createOtherSend(context, body, options);
  return _createOtherDeserialize(result);
}

export function _createWidgetSend(
  context: Client,
  body: WidgetCreate_1,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/widgets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: widgetCreateSerializer_1(body),
    });
}

export async function _createWidgetDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}
/** Create a widget. Body `Widget` -> synthesized `WidgetCreate` (collides with the user model). */
export async function createWidget(
  context: Client,
  body: WidgetCreate_1,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createWidgetSend(context, body, options);
  return _createWidgetDeserialize(result);
}
