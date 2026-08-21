// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export { SpreadServiceClient } from "./spreadServiceClient.js";
export type { Widget, DetailCreate, Detail, Container } from "./models/index.js";
export type {
  CreateContainerOptionalParams,
  CreateWidgetOptionalParams,
  SpreadServiceClientOptionalParams,
} from "./api/index.js";
export { RestError, isRestError } from "@azure/core-rest-pipeline";
