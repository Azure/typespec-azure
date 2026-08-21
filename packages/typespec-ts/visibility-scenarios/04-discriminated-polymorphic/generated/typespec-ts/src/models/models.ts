// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/** model interface Cat */
export interface Cat extends Pet {
  kind: "cat";
  /** Server-assigned lives-left counter (read-only). */
  readonly livesLeft: number;
  /** Writable meow loudness. */
  meowVolume: number;
}

export function catSerializer(item: Cat): any {
  return { kind: item["kind"], name: item["name"], meowVolume: item["meowVolume"] };
}

export function catDeserializer(item: any): Cat {
  return {
    kind: item["kind"],
    petId: item["petId"],
    name: item["name"],
    livesLeft: item["livesLeft"],
    meowVolume: item["meowVolume"],
  };
}

/**
 * Discriminated base model used as a POST body. It has a required read-only
 * `petId`, and its `Cat` subtype has its own read-only `livesLeft`. The
 * visibility-split pre-pass projects the whole discriminator hierarchy: the base
 * becomes `PetCreate` (drops `petId`) and each subtype is re-parented to it
 * (`CatCreate extends PetCreate` drops `livesLeft`; `DogCreate` re-parents even
 * though it adds no read-only props of its own), so `PetCreateUnion` is emitted
 * and no read-only property leaks into the write body.
 */
export interface Pet {
  /** Discriminator property for Pet. */
  /** The discriminator possible values: cat, dog */
  kind: string;
  /** Server-assigned identifier. */
  readonly petId: string;
  /** Common writable name. */
  name: string;
}

export function petSerializer(item: Pet): any {
  return { kind: item["kind"], name: item["name"] };
}

export function petDeserializer(item: any): Pet {
  return {
    kind: item["kind"],
    petId: item["petId"],
    name: item["name"],
  };
}

/** Alias for PetUnion */
export type PetUnion = Cat | Dog | Pet;

export function petUnionSerializer(item: PetUnion): any {
  switch (item.kind) {
    case "cat":
      return catSerializer(item as Cat);

    case "dog":
      return dogSerializer(item as Dog);

    default:
      return petSerializer(item);
  }
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "cat":
      return catDeserializer(item as Cat);

    case "dog":
      return dogDeserializer(item as Dog);

    default:
      return petDeserializer(item);
  }
}

/** model interface Dog */
export interface Dog extends Pet {
  kind: "dog";
  /** Writable bark loudness. */
  barkVolume: number;
}

export function dogSerializer(item: Dog): any {
  return { kind: item["kind"], name: item["name"], barkVolume: item["barkVolume"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    kind: item["kind"],
    petId: item["petId"],
    name: item["name"],
    barkVolume: item["barkVolume"],
  };
}

/**
 * Discriminated base model used as a POST body. It has a required read-only
 * `petId`, and its `Cat` subtype has its own read-only `livesLeft`. The
 * visibility-split pre-pass projects the whole discriminator hierarchy: the base
 * becomes `PetCreate` (drops `petId`) and each subtype is re-parented to it
 * (`CatCreate extends PetCreate` drops `livesLeft`; `DogCreate` re-parents even
 * though it adds no read-only props of its own), so `PetCreateUnion` is emitted
 * and no read-only property leaks into the write body.
 */
export interface PetCreate {
  /** Discriminator property for Pet. */
  /** The discriminator possible values: cat, dog */
  kind: string;
  /** Common writable name. */
  name: string;
}

export function petCreateSerializer(item: PetCreate): any {
  return { kind: item["kind"], name: item["name"] };
}

export function petCreateDeserializer(item: any): PetCreate {
  return {
    kind: item["kind"],
    name: item["name"],
  };
}

/** Alias for PetCreateUnion */
export type PetCreateUnion = CatCreate | DogCreate | PetCreate;

export function petCreateUnionSerializer(item: PetCreateUnion): any {
  switch (item.kind) {
    case "cat":
      return catCreateSerializer(item as CatCreate);

    case "dog":
      return dogCreateSerializer(item as DogCreate);

    default:
      return petCreateSerializer(item);
  }
}

export function petCreateUnionDeserializer(item: any): PetCreateUnion {
  switch (item["kind"]) {
    case "cat":
      return catCreateDeserializer(item as CatCreate);

    case "dog":
      return dogCreateDeserializer(item as DogCreate);

    default:
      return petCreateDeserializer(item);
  }
}

/** model interface CatCreate */
export interface CatCreate extends PetCreate {
  kind: "cat";
  /** Writable meow loudness. */
  meowVolume: number;
}

export function catCreateSerializer(item: CatCreate): any {
  return { kind: item["kind"], name: item["name"], meowVolume: item["meowVolume"] };
}

export function catCreateDeserializer(item: any): CatCreate {
  return {
    kind: item["kind"],
    name: item["name"],
    meowVolume: item["meowVolume"],
  };
}

/** model interface DogCreate */
export interface DogCreate extends PetCreate {
  kind: "dog";
  /** Writable bark loudness. */
  barkVolume: number;
}

export function dogCreateSerializer(item: DogCreate): any {
  return { kind: item["kind"], name: item["name"], barkVolume: item["barkVolume"] };
}

export function dogCreateDeserializer(item: any): DogCreate {
  return {
    kind: item["kind"],
    name: item["name"],
    barkVolume: item["barkVolume"],
  };
}
