// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { WidgetServiceContext as Client } from "./index.js";
import {
  Widget,
  widgetDeserializer,
  Gadget,
  gadgetSerializer,
  gadgetDeserializer,
  WidgetCreate,
  widgetCreateSerializer,
} from "../models/models.js";
import { CreateGadgetOptionalParams, CreateWidgetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createGadgetSend(
  context: Client,
  body: Gadget,
  options: CreateGadgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/gadgets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: gadgetSerializer(body),
    });
}

export async function _createGadgetDeserialize(result: PathUncheckedResponse): Promise<Gadget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return gadgetDeserializer(result.body);
}
/** Create a gadget. With no read-only props the write view collapses to the same model, so request and response share it. */
export async function createGadget(
  context: Client,
  body: Gadget,
  options: CreateGadgetOptionalParams = { requestOptions: {} },
): Promise<Gadget> {
  const result = await _createGadgetSend(context, body, options);
  return _createGadgetDeserialize(result);
}

export function _createWidgetSend(
  context: Client,
  body: WidgetCreate,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/widgets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: widgetCreateSerializer(body),
    });
}

export async function _createWidgetDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}
/** Create a widget. The POST body is projected to the Create visibility. */
export async function createWidget(
  context: Client,
  body: WidgetCreate,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createWidgetSend(context, body, options);
  return _createWidgetDeserialize(result);
}
