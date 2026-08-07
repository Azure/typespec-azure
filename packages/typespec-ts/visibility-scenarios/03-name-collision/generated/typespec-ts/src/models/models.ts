// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/** A widget with required read-only props. Its POST body projects to a *synthesized* `WidgetCreate`. */
export interface Widget {
  /** Server-assigned identifier. */
  readonly id: string;
  /** Server-assigned name. */
  readonly name: string;
  /** Display name (writable). */
  displayName: string;
}

export function widgetSerializer(item: Widget): any {
  return { displayName: item["displayName"] };
}

export function widgetDeserializer(item: any): Widget {
  return {
    id: item["id"],
    name: item["name"],
    displayName: item["displayName"],
  };
}

/**
 * A model the USER already named `WidgetCreate`. It has no read-only properties,
 * so its own write view collapses to itself (no rename). It therefore competes for
 * the exact name the visibility split synthesizes for `Widget`'s create body.
 */
export interface WidgetCreate {
  /** An unrelated field. */
  foo: string;
  /** Another unrelated field. */
  bar: number;
}

export function widgetCreateSerializer(item: WidgetCreate): any {
  return { foo: item["foo"], bar: item["bar"] };
}

export function widgetCreateDeserializer(item: any): WidgetCreate {
  return {
    foo: item["foo"],
    bar: item["bar"],
  };
}

/** A widget with required read-only props. Its POST body projects to a *synthesized* `WidgetCreate`. */
export interface WidgetCreate_1 {
  /** Display name (writable). */
  displayName: string;
}

export function widgetCreateSerializer_1(item: WidgetCreate_1): any {
  return { displayName: item["displayName"] };
}

export function widgetCreateDeserializer_1(item: any): WidgetCreate_1 {
  return {
    displayName: item["displayName"],
  };
}
