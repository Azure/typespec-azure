// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { SpreadServiceContext as Client } from "./index.js";
import {
  Widget,
  widgetDeserializer,
  DetailCreate,
  detailCreateSerializer,
  Container,
  containerDeserializer,
} from "../models/models.js";
import { CreateContainerOptionalParams, CreateWidgetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createContainerSend(
  context: Client,
  title: string,
  detail: DetailCreate,
  options: CreateContainerOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/containers")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: { title: title, detail: detailCreateSerializer(detail) },
    });
}

export async function _createContainerDeserialize(
  result: PathUncheckedResponse,
): Promise<Container> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return containerDeserializer(result.body);
}
/** Create a container with a spread body that nests a model property. */
export async function createContainer(
  context: Client,
  title: string,
  detail: DetailCreate,
  options: CreateContainerOptionalParams = { requestOptions: {} },
): Promise<Container> {
  const result = await _createContainerSend(context, title, detail, options);
  return _createContainerDeserialize(result);
}

export function _createWidgetSend(
  context: Client,
  displayName: string,
  weight: number,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/widgets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: { displayName: displayName, weight: weight },
    });
}

export async function _createWidgetDeserialize(result: PathUncheckedResponse): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}
/** Create a widget with a spread body. */
export async function createWidget(
  context: Client,
  displayName: string,
  weight: number,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _createWidgetSend(context, displayName, weight, options);
  return _createWidgetDeserialize(result);
}
