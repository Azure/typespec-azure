// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/** Model A used as a PUT body; contains a nested model B. */
export interface A {
  /** Server-assigned identifier for A. */
  readonly aid: string;
  /** Nested child model (writable). */
  child: B;
}

export function aSerializer(item: A): any {
  return { child: bSerializer(item["child"]) };
}

export function aDeserializer(item: any): A {
  return {
    aid: item["aid"],
    child: bDeserializer(item["child"]),
  };
}

/** Nested model B, referenced by A. Has a required read-only property. */
export interface B {
  /** Server-assigned identifier for B. */
  readonly bid: string;
  /** Label (writable). */
  label: string;
}

export function bSerializer(item: B): any {
  return { label: item["label"] };
}

export function bDeserializer(item: any): B {
  return {
    bid: item["bid"],
    label: item["label"],
  };
}

/** Model C used as a POST body; has only writable properties but nests D (which has a read-only prop). */
export interface C {
  /** Name (writable). */
  name: string;
  /** Nested child model (writable). */
  child: D;
}

export function cSerializer(item: C): any {
  return { name: item["name"], child: dSerializer(item["child"]) };
}

export function cDeserializer(item: any): C {
  return {
    name: item["name"],
    child: dDeserializer(item["child"]),
  };
}

/** Nested model D, referenced by C. Has both writable and read-only properties. */
export interface D {
  /** Server-assigned identifier for D. */
  readonly did: string;
  /** Label (writable). */
  label: string;
}

export function dSerializer(item: D): any {
  return { label: item["label"] };
}

export function dDeserializer(item: any): D {
  return {
    did: item["did"],
    label: item["label"],
  };
}

/** Nested model B, referenced by A. Has a required read-only property. */
export interface BCreateOrUpdate {
  /** Label (writable). */
  label: string;
}

export function bCreateOrUpdateSerializer(item: BCreateOrUpdate): any {
  return { label: item["label"] };
}

export function bCreateOrUpdateDeserializer(item: any): BCreateOrUpdate {
  return {
    label: item["label"],
  };
}

/** Model A used as a PUT body; contains a nested model B. */
export interface ACreateOrUpdate {
  /** Nested child model (writable). */
  child: BCreateOrUpdate;
}

export function aCreateOrUpdateSerializer(item: ACreateOrUpdate): any {
  return { child: bCreateOrUpdateSerializer(item["child"]) };
}

export function aCreateOrUpdateDeserializer(item: any): ACreateOrUpdate {
  return {
    child: bCreateOrUpdateDeserializer(item["child"]),
  };
}

/** Nested model D, referenced by C. Has both writable and read-only properties. */
export interface DCreate {
  /** Label (writable). */
  label: string;
}

export function dCreateSerializer(item: DCreate): any {
  return { label: item["label"] };
}

export function dCreateDeserializer(item: any): DCreate {
  return {
    label: item["label"],
  };
}

/** Model C used as a POST body; has only writable properties but nests D (which has a read-only prop). */
export interface CCreate {
  /** Name (writable). */
  name: string;
  /** Nested child model (writable). */
  child: DCreate;
}

export function cCreateSerializer(item: CCreate): any {
  return { name: item["name"], child: dCreateSerializer(item["child"]) };
}

export function cCreateDeserializer(item: any): CCreate {
  return {
    name: item["name"],
    child: dCreateDeserializer(item["child"]),
  };
}
