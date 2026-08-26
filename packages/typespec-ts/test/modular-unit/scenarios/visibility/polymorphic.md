# Project and reparent a discriminated hierarchy

Verifies that the base and all subtypes are projected together, reparented to the projected base, and used by the generated operation input types.

## TypeSpec

```tsp
@discriminator("kind")
model Pet {
  @visibility(Lifecycle.Read)
  petId: string;
  name: string;
}

model Cat extends Pet {
  kind: "cat";
  @visibility(Lifecycle.Read)
  livesLeft: int32;
  meowVolume: int32;
}

model Dog extends Pet {
  kind: "dog";
  barkVolume: int32;
}

@route("/cats")
@post
op createCat(@body body: Cat): Cat;

@route("/pets")
@post
op createPet(@body body: Pet): Pet;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Pet {
  kind: "cat";
  readonly livesLeft: number;
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

/** model interface Pet */
export interface Pet {
  /** Discriminator property for Pet. */
  /** The discriminator possible values: cat, dog */
  kind: string;
  readonly petId: string;
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

/** model interface CatCreate */
export interface CatCreate extends PetCreate {
  kind: "cat";
  meowVolume: number;
}

export function catCreateSerializer(item: CatCreate): any {
  return { kind: item["kind"], name: item["name"], meowVolume: item["meowVolume"] };
}

/** model interface PetCreate */
export interface PetCreate {
  /** Discriminator property for Pet. */
  /** The discriminator possible values: cat, dog */
  kind: string;
  name: string;
}

export function petCreateSerializer(item: PetCreate): any {
  return { kind: item["kind"], name: item["name"] };
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

/** model interface DogCreate */
export interface DogCreate extends PetCreate {
  kind: "dog";
  barkVolume: number;
}

export function dogCreateSerializer(item: DogCreate): any {
  return { kind: item["kind"], name: item["name"], barkVolume: item["barkVolume"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Cat,
  catDeserializer,
  petUnionDeserializer,
  PetUnion,
  CatCreate,
  catCreateSerializer,
  petCreateUnionSerializer,
  PetCreateUnion,
} from "../models/models.js";
import { CreatePetOptionalParams, CreateCatOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createPetSend(
  context: Client,
  body: PetCreateUnion,
  options: CreatePetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/pets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: petCreateUnionSerializer(body),
    });
}

export async function _createPetDeserialize(result: PathUncheckedResponse): Promise<PetUnion> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petUnionDeserializer(result.body);
}

export async function createPet(
  context: Client,
  body: PetCreateUnion,
  options: CreatePetOptionalParams = { requestOptions: {} },
): Promise<PetUnion> {
  const result = await _createPetSend(context, body, options);
  return _createPetDeserialize(result);
}

export function _createCatSend(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/cats")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: catCreateSerializer(body),
    });
}

export async function _createCatDeserialize(result: PathUncheckedResponse): Promise<Cat> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return catDeserializer(result.body);
}

export async function createCat(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): Promise<Cat> {
  const result = await _createCatSend(context, body, options);
  return _createCatDeserialize(result);
}
```


# Project the full discriminated hierarchy when only one subtype differs

Verifies that when only Cat has a read-only property, the projected discriminated hierarchy still includes PetCreate, CatCreate, DogCreate, and PetCreateUnion.

## TypeSpec

```tsp
@discriminator("kind")
model Pet {
  name: string;
}

model Cat extends Pet {
  kind: "cat";
  @visibility(Lifecycle.Read)
  livesLeft: int32;
  meowVolume: int32;
}

model Dog extends Pet {
  kind: "dog";
  barkVolume: int32;
}

@route("/cats")
@post
op createCat(@body body: Cat): Cat;

@route("/pets")
@post
op createPet(@body body: Pet): Pet;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Pet {
  kind: "cat";
  readonly livesLeft: number;
  meowVolume: number;
}

export function catSerializer(item: Cat): any {
  return { kind: item["kind"], name: item["name"], meowVolume: item["meowVolume"] };
}

export function catDeserializer(item: any): Cat {
  return {
    kind: item["kind"],
    name: item["name"],
    livesLeft: item["livesLeft"],
    meowVolume: item["meowVolume"],
  };
}

/** model interface Pet */
export interface Pet {
  /** Discriminator property for Pet. */
  /** The discriminator possible values: cat, dog */
  kind: string;
  name: string;
}

export function petSerializer(item: Pet): any {
  return { kind: item["kind"], name: item["name"] };
}

export function petDeserializer(item: any): Pet {
  return {
    kind: item["kind"],
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
  barkVolume: number;
}

export function dogSerializer(item: Dog): any {
  return { kind: item["kind"], name: item["name"], barkVolume: item["barkVolume"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    kind: item["kind"],
    name: item["name"],
    barkVolume: item["barkVolume"],
  };
}

/** model interface CatCreate */
export interface CatCreate extends PetCreate {
  kind: "cat";
  meowVolume: number;
}

export function catCreateSerializer(item: CatCreate): any {
  return { kind: item["kind"], name: item["name"], meowVolume: item["meowVolume"] };
}

/** model interface PetCreate */
export interface PetCreate {
  /** Discriminator property for Pet. */
  /** The discriminator possible values: cat, dog */
  kind: string;
  name: string;
}

export function petCreateSerializer(item: PetCreate): any {
  return { kind: item["kind"], name: item["name"] };
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

/** model interface DogCreate */
export interface DogCreate extends PetCreate {
  kind: "dog";
  barkVolume: number;
}

export function dogCreateSerializer(item: DogCreate): any {
  return { kind: item["kind"], name: item["name"], barkVolume: item["barkVolume"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Cat,
  catDeserializer,
  petUnionDeserializer,
  PetUnion,
  CatCreate,
  catCreateSerializer,
  petCreateUnionSerializer,
  PetCreateUnion,
} from "../models/models.js";
import { CreatePetOptionalParams, CreateCatOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createPetSend(
  context: Client,
  body: PetCreateUnion,
  options: CreatePetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/pets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: petCreateUnionSerializer(body),
    });
}

export async function _createPetDeserialize(result: PathUncheckedResponse): Promise<PetUnion> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petUnionDeserializer(result.body);
}

export async function createPet(
  context: Client,
  body: PetCreateUnion,
  options: CreatePetOptionalParams = { requestOptions: {} },
): Promise<PetUnion> {
  const result = await _createPetSend(context, body, options);
  return _createPetDeserialize(result);
}

export function _createCatSend(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/cats")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: catCreateSerializer(body),
    });
}

export async function _createCatDeserialize(result: PathUncheckedResponse): Promise<Cat> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return catDeserializer(result.body);
}

export async function createCat(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): Promise<Cat> {
  const result = await _createCatSend(context, body, options);
  return _createCatDeserialize(result);
}
```


# Project inherited differences in a non-discriminated hierarchy

Verifies that a derived request model is projected and reparented when its non-discriminated base model has a read-only property.

## TypeSpec

```tsp
model Base {
  @visibility(Lifecycle.Read)
  id: string;
  value: string;
}

model Derived extends Base {
  extra: string;
}

@post
op createDerived(@body body: Derived): Derived;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Derived */
export interface Derived extends Base {
  extra: string;
}

export function derivedSerializer(item: Derived): any {
  return { value: item["value"], extra: item["extra"] };
}

export function derivedDeserializer(item: any): Derived {
  return {
    id: item["id"],
    value: item["value"],
    extra: item["extra"],
  };
}

/** model interface Base */
export interface Base {
  readonly id: string;
  value: string;
}

export function baseSerializer(item: Base): any {
  return { value: item["value"] };
}

export function baseDeserializer(item: any): Base {
  return {
    id: item["id"],
    value: item["value"],
  };
}

/** model interface DerivedCreate */
export interface DerivedCreate extends BaseCreate {
  extra: string;
}

export function derivedCreateSerializer(item: DerivedCreate): any {
  return { value: item["value"], extra: item["extra"] };
}

/** model interface BaseCreate */
export interface BaseCreate {
  value: string;
}

export function baseCreateSerializer(item: BaseCreate): any {
  return { value: item["value"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Derived,
  derivedDeserializer,
  DerivedCreate,
  derivedCreateSerializer,
} from "../models/models.js";
import { CreateDerivedOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createDerivedSend(
  context: Client,
  body: DerivedCreate,
  options: CreateDerivedOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: derivedCreateSerializer(body),
    });
}

export async function _createDerivedDeserialize(result: PathUncheckedResponse): Promise<Derived> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return derivedDeserializer(result.body);
}

export async function createDerived(
  context: Client,
  body: DerivedCreate,
  options: CreateDerivedOptionalParams = { requestOptions: {} },
): Promise<Derived> {
  const result = await _createDerivedSend(context, body, options);
  return _createDerivedDeserialize(result);
}
```


# Propagate differences through multiple inheritance levels

Verifies that a read-only property in a non-discriminated base propagates through multiple derived request-model levels.

## TypeSpec

```tsp
model Base {
  @visibility(Lifecycle.Read)
  id: string;
  value: string;
}

model Middle extends Base {
  middle: string;
}

model Derived extends Middle {
  extra: string;
}

@post
op createDerived(@body body: Derived): Derived;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Derived */
export interface Derived extends Middle {
  extra: string;
}

export function derivedSerializer(item: Derived): any {
  return { middle: item["middle"], value: item["value"], extra: item["extra"] };
}

export function derivedDeserializer(item: any): Derived {
  return {
    middle: item["middle"],
    id: item["id"],
    value: item["value"],
    extra: item["extra"],
  };
}

/** model interface Middle */
export interface Middle extends Base {
  middle: string;
}

export function middleSerializer(item: Middle): any {
  return { value: item["value"], middle: item["middle"] };
}

export function middleDeserializer(item: any): Middle {
  return {
    id: item["id"],
    value: item["value"],
    middle: item["middle"],
  };
}

/** model interface Base */
export interface Base {
  readonly id: string;
  value: string;
}

export function baseSerializer(item: Base): any {
  return { value: item["value"] };
}

export function baseDeserializer(item: any): Base {
  return {
    id: item["id"],
    value: item["value"],
  };
}

/** model interface DerivedCreate */
export interface DerivedCreate extends MiddleCreate {
  extra: string;
}

export function derivedCreateSerializer(item: DerivedCreate): any {
  return { middle: item["middle"], value: item["value"], extra: item["extra"] };
}

/** model interface MiddleCreate */
export interface MiddleCreate extends BaseCreate {
  middle: string;
}

export function middleCreateSerializer(item: MiddleCreate): any {
  return { value: item["value"], middle: item["middle"] };
}

/** model interface BaseCreate */
export interface BaseCreate {
  value: string;
}

export function baseCreateSerializer(item: BaseCreate): any {
  return { value: item["value"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Derived,
  derivedDeserializer,
  DerivedCreate,
  derivedCreateSerializer,
} from "../models/models.js";
import { CreateDerivedOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createDerivedSend(
  context: Client,
  body: DerivedCreate,
  options: CreateDerivedOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: derivedCreateSerializer(body),
    });
}

export async function _createDerivedDeserialize(result: PathUncheckedResponse): Promise<Derived> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return derivedDeserializer(result.body);
}

export async function createDerived(
  context: Client,
  body: DerivedCreate,
  options: CreateDerivedOptionalParams = { requestOptions: {} },
): Promise<Derived> {
  const result = await _createDerivedSend(context, body, options);
  return _createDerivedDeserialize(result);
}
```


# Project only the affected subtype in a non-discriminated hierarchy

Verifies that when only Cat has a read-only property, Cat is projected while the unchanged Pet base and Dog subtype reuse their original models.

## TypeSpec

```tsp
model Pet {
  name: string;
}

model Cat extends Pet {
  @visibility(Lifecycle.Read)
  livesLeft: int32;
  meowVolume: int32;
}

model Dog extends Pet {
  barkVolume: int32;
}

@route("/cats")
@post
op createCat(@body body: Cat): Cat;

@route("/dogs")
@post
op createDog(@body body: Dog): Dog;

@route("/pets")
@post
op createPet(@body body: Pet): Pet;
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Models

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Pet {
  readonly livesLeft: number;
  meowVolume: number;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meowVolume: item["meowVolume"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    livesLeft: item["livesLeft"],
    meowVolume: item["meowVolume"],
  };
}

/** model interface Pet */
export interface Pet {
  name: string;
}

export function petSerializer(item: Pet): any {
  return { name: item["name"] };
}

export function petDeserializer(item: any): Pet {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Pet {
  barkVolume: number;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], barkVolume: item["barkVolume"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    barkVolume: item["barkVolume"],
  };
}

/** model interface CatCreate */
export interface CatCreate extends Pet {
  meowVolume: number;
}

export function catCreateSerializer(item: CatCreate): any {
  return { name: item["name"], meowVolume: item["meowVolume"] };
}
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Cat,
  catDeserializer,
  Pet,
  petSerializer,
  petDeserializer,
  Dog,
  dogSerializer,
  dogDeserializer,
  CatCreate,
  catCreateSerializer,
} from "../models/models.js";
import {
  CreatePetOptionalParams,
  CreateDogOptionalParams,
  CreateCatOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _createPetSend(
  context: Client,
  body: Pet,
  options: CreatePetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/pets")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: petSerializer(body),
    });
}

export async function _createPetDeserialize(result: PathUncheckedResponse): Promise<Pet> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petDeserializer(result.body);
}

export async function createPet(
  context: Client,
  body: Pet,
  options: CreatePetOptionalParams = { requestOptions: {} },
): Promise<Pet> {
  const result = await _createPetSend(context, body, options);
  return _createPetDeserialize(result);
}

export function _createDogSend(
  context: Client,
  body: Dog,
  options: CreateDogOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/dogs")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: dogSerializer(body),
    });
}

export async function _createDogDeserialize(result: PathUncheckedResponse): Promise<Dog> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return dogDeserializer(result.body);
}

export async function createDog(
  context: Client,
  body: Dog,
  options: CreateDogOptionalParams = { requestOptions: {} },
): Promise<Dog> {
  const result = await _createDogSend(context, body, options);
  return _createDogDeserialize(result);
}

export function _createCatSend(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/cats")
    .post({
      ...operationOptionsToRequestParameters(options),
      contentType: "application/json",
      headers: { accept: "application/json", ...options.requestOptions?.headers },
      body: catCreateSerializer(body),
    });
}

export async function _createCatDeserialize(result: PathUncheckedResponse): Promise<Cat> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return catDeserializer(result.body);
}

export async function createCat(
  context: Client,
  body: CatCreate,
  options: CreateCatOptionalParams = { requestOptions: {} },
): Promise<Cat> {
  const result = await _createCatSend(context, body, options);
  return _createCatDeserialize(result);
}
```

