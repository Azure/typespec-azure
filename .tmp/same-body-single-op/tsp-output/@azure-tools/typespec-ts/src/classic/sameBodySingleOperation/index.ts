// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ContentNegotiationContext } from "../../api/contentNegotiationContext.js";
import { getAvatar } from "../../api/sameBodySingleOperation/operations.js";
import { SameBodySingleOperationGetAvatarOptionalParams } from "../../api/sameBodySingleOperation/options.js";
import { SameBodySingleOperationGetAvatarResponse } from "../../models/models.js";

/** Interface representing a SameBodySingleOperation operations. */
export interface SameBodySingleOperationOperations {
  getAvatar: (
    format: string,
    options?: SameBodySingleOperationGetAvatarOptionalParams,
  ) => Promise<SameBodySingleOperationGetAvatarResponse>;
}

function _getSameBodySingleOperation(context: ContentNegotiationContext) {
  return {
    getAvatar: (format: string, options?: SameBodySingleOperationGetAvatarOptionalParams) =>
      getAvatar(context, format, options),
  };
}

export function _getSameBodySingleOperationOperations(
  context: ContentNegotiationContext,
): SameBodySingleOperationOperations {
  return {
    ..._getSameBodySingleOperation(context),
  };
}
