// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ContentNegotiationContext as Client } from "../index.js";
import { SameBodySingleOperationGetAvatarResponse } from "../../models/models.js";
import { getBinaryStreamResponse } from "../../static-helpers/serialization/get-binary-stream-response.js";
import { expandUrlTemplate } from "../../static-helpers/urlTemplate.js";
import { SameBodySingleOperationGetAvatarOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _getAvatarSend(
  context: Client,
  format: string,
  options: SameBodySingleOperationGetAvatarOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/content-negotiation/same-body-single-operation/{format}",
    {
      format: format,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({ ...operationOptionsToRequestParameters(options) });
}

export async function _getAvatarDeserialize(
  result: PathUncheckedResponse & SameBodySingleOperationGetAvatarResponse,
): Promise<SameBodySingleOperationGetAvatarResponse> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return { blobBody: result.blobBody, readableStreamBody: result.readableStreamBody };
}

export async function getAvatar(
  context: Client,
  format: string,
  options: SameBodySingleOperationGetAvatarOptionalParams = { requestOptions: {} },
): Promise<SameBodySingleOperationGetAvatarResponse> {
  const streamableMethod = _getAvatarSend(context, format, options);
  const result = await getBinaryStreamResponse(streamableMethod);
  return _getAvatarDeserialize(result);
}
