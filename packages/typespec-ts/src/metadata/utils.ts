// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ClientModel } from "../interfaces.js";

export function getPackageName(model: ClientModel): string {
  return model.options?.packageDetails?.name ?? model.libraryName;
}
