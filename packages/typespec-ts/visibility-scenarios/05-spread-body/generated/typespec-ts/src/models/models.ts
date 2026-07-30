// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/**
 * Model whose properties are spread into the operation signature. Its required
 * read-only `id` is a *top-level* property, so TCGC drops it when it flattens the
 * model into individual method parameters (request visibility is applied per
 * spread parameter). The generated `createWidget(displayName, weight)` already
 * omits `id` — a benign no-op for the pre-pass. Contrast with `Container` below,
 * where a *nested* read-only property still leaks.
 */
export interface Widget {
  /** Server-assigned identifier (read-only). */
  readonly id: string;
  /** Writable display name. */
  displayName: string;
  /** Writable weight. */
  weight: number;
}

export function widgetDeserializer(item: any): Widget {
  return {
    id: item["id"],
    displayName: item["displayName"],
    weight: item["weight"],
  };
}

/**
 * Nested model reached through a spread body's model-typed property. It has a
 * required read-only `detailId`.
 */
export interface DetailCreate {
  /** Writable note. */
  note: string;
}

export function detailCreateSerializer(item: DetailCreate): any {
  return { note: item["note"] };
}

export function detailCreateDeserializer(item: any): DetailCreate {
  return {
    note: item["note"],
  };
}

/**
 * Nested model reached through a spread body's model-typed property. It has a
 * required read-only `detailId`.
 */
export interface Detail {
  /** Server-assigned identifier (read-only). */
  readonly detailId: string;
  /** Writable note. */
  note: string;
}

export function detailSerializer(item: Detail): any {
  return { note: item["note"] };
}

export function detailDeserializer(item: any): Detail {
  return {
    detailId: item["detailId"],
    note: item["note"],
  };
}

/**
 * Model whose properties are spread into the operation signature, including a
 * model-typed `detail` property. Spreading drops the top-level read-only
 * `containerId` (TCGC applies request visibility per spread parameter), and the
 * pre-pass additionally repoints the nested `detail` parameter. TCGC exposes the
 * spread mapping via `bodyParam.methodParameterSegments` (each segment's root is a
 * client-method parameter), so the pre-pass projects the model-typed `detail`
 * parameter to the write view and repoints BOTH the method parameter and the
 * matching wrapper property. The generated `createContainer(title, detail)` now
 * takes `detail: DetailCreate` (no read-only `detailId`) and serializes it with
 * `detailCreateSerializer`, and the synthesized `DetailCreate` is referenced rather
 * than orphaned. Inspect the generated `createContainer` signature and body
 * serialization to see the fix.
 */
export interface Container {
  /** Server-assigned identifier (read-only). */
  readonly containerId: string;
  /** Writable title. */
  title: string;
  /** Nested model carrying its own read-only property. */
  detail: Detail;
}

export function containerDeserializer(item: any): Container {
  return {
    containerId: item["containerId"],
    title: item["title"],
    detail: detailDeserializer(item["detail"]),
  };
}
