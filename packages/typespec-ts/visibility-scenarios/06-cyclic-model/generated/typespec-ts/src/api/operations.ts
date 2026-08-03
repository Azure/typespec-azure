// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CyclicServiceContext as Client } from "./index.js";
import { Node, nodeDeserializer, NodeCreate, nodeCreateSerializer } from "../models/models.js";
import { CreateNodeOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createNodeSend(
  context: Client,
  body: NodeCreate,
  options: CreateNodeOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/nodes")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: nodeCreateSerializer(body),
    });
}

export async function _createNodeDeserialize(result: PathUncheckedResponse): Promise<Node> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return nodeDeserializer(result.body);
}
/** Create a node. POST -> Create; body projects to NodeCreate. */
export async function createNode(
  context: Client,
  body: NodeCreate,
  options: CreateNodeOptionalParams = { requestOptions: {} },
): Promise<Node> {
  const result = await _createNodeSend(context, body, options);
  return _createNodeDeserialize(result);
}
