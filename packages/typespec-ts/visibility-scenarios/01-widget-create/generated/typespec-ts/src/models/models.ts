// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/** A widget. */
export interface Widget {
  /** Server-assigned identifier. */
  readonly id: string;
  /** Server-assigned name. */
  readonly name: string;
  /** Display name (writable). */
  displayName: string;
  /** Weight (writable). */
  weight: number;
}

export function widgetSerializer(item: Widget): any {
  return { displayName: item["displayName"], weight: item["weight"] };
}

export function widgetDeserializer(item: any): Widget {
  return {
    id: item["id"],
    name: item["name"],
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** A gadget with no read-only properties. */
export interface Gadget {
  /** Display name (writable). */
  displayName: string;
  /** Weight (writable). */
  weight: number;
}

export function gadgetSerializer(item: Gadget): any {
  return { displayName: item["displayName"], weight: item["weight"] };
}

export function gadgetDeserializer(item: any): Gadget {
  return {
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/** A widget. */
export interface WidgetCreate {
  /** Display name (writable). */
  displayName: string;
  /** Weight (writable). */
  weight: number;
}

export function widgetCreateSerializer(item: WidgetCreate): any {
  return { displayName: item["displayName"], weight: item["weight"] };
}

export function widgetCreateDeserializer(item: any): WidgetCreate {
  return {
    displayName: item["displayName"],
    weight: item["weight"],
  };
}
