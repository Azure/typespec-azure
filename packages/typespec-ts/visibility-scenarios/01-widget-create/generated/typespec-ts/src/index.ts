// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export { WidgetServiceClient } from "./widgetServiceClient.js";
export type { Widget, Gadget, WidgetCreate } from "./models/index.js";
export type {
  CreateGadgetOptionalParams,
  CreateWidgetOptionalParams,
  WidgetServiceClientOptionalParams,
} from "./api/index.js";
export { RestError, isRestError } from "@azure/core-rest-pipeline";
