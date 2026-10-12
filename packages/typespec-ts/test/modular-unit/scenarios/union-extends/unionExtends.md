# UE01: Variants directly inherit the named base

These scenarios reproduce the twelve language-review cases from
[microsoft/typespec#11977](https://github.com/microsoft/typespec/pull/11977).
HTTP operations make each reviewed type reachable in both requests and responses.
The snapshots record current emitter behavior, not a recommendation for Azure
authoring or proof of runtime round-trip correctness. The experimental compiler
feature is enabled explicitly; diagnostics are not ignored.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Dog extends Named {
  bark: boolean;
}
union Pets extends Named {
  cat: Cat,
  dog: Dog,
}

@route("/pets")
@post
op sendPet(@body pet: Pets): Pets;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Named {
  bark: boolean;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** Alias for Pets */
export type Pets = Cat | Dog;

export function petsSerializer(item: Pets): any {
  return item;
}

export function petsDeserializer(item: any): Pets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import { Pets, petsSerializer, petsDeserializer } from "../models/models.js";
import { SendPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendPetSend(
  context: Client,
  pet: Pets,
  options: SendPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: petsSerializer(pet),
  });
}

export async function _sendPetDeserialize(result: PathUncheckedResponse): Promise<Pets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petsDeserializer(result.body);
}

export async function sendPet(
  context: Client,
  pet: Pets,
  options: SendPetOptionalParams = { requestOptions: {} },
): Promise<Pets> {
  const result = await _sendPetSend(context, pet, options);
  return _sendPetDeserialize(result);
}
```

# UE02: Structural compatibility without inheritance

The variants satisfy the compiler constraint without explicitly inheriting from
the base. This is a control case for evaluating additional Azure lint restrictions.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model StructuralCat {
  name: string;
  meow: boolean;
}
model StructuralDog {
  name: string;
  bark: boolean;
}
union StructuralPets extends Named {
  cat: StructuralCat,
  dog: StructuralDog,
}

@route("/structural-pets")
@post
op sendPet(@body pet: StructuralPets): StructuralPets;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface StructuralCat */
export interface StructuralCat {
  name: string;
  meow: boolean;
}

export function structuralCatSerializer(item: StructuralCat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function structuralCatDeserializer(item: any): StructuralCat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface StructuralDog */
export interface StructuralDog {
  name: string;
  bark: boolean;
}

export function structuralDogSerializer(item: StructuralDog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function structuralDogDeserializer(item: any): StructuralDog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** Alias for StructuralPets */
export type StructuralPets = StructuralCat | StructuralDog;

export function structuralPetsSerializer(item: StructuralPets): any {
  return item;
}

export function structuralPetsDeserializer(item: any): StructuralPets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  StructuralPets,
  structuralPetsSerializer,
  structuralPetsDeserializer,
} from "../models/models.js";
import { SendPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendPetSend(
  context: Client,
  pet: StructuralPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/structural-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: structuralPetsSerializer(pet),
  });
}

export async function _sendPetDeserialize(result: PathUncheckedResponse): Promise<StructuralPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return structuralPetsDeserializer(result.body);
}

export async function sendPet(
  context: Client,
  pet: StructuralPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): Promise<StructuralPets> {
  const result = await _sendPetSend(context, pet, options);
  return _sendPetDeserialize(result);
}
```

# UE03: Spread and model is

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model SpreadCat {
  ...Named;
  meow: boolean;
}
model DogShape {
  name: string;
  bark: boolean;
}
model CopiedDog is DogShape;
union ComposedPets extends Named {
  cat: SpreadCat,
  dog: CopiedDog,
}

@route("/composed-pets")
@post
op sendPet(@body pet: ComposedPets): ComposedPets;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface SpreadCat */
export interface SpreadCat {
  name: string;
  meow: boolean;
}

export function spreadCatSerializer(item: SpreadCat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function spreadCatDeserializer(item: any): SpreadCat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface CopiedDog */
export interface CopiedDog {
  name: string;
  bark: boolean;
}

export function copiedDogSerializer(item: CopiedDog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function copiedDogDeserializer(item: any): CopiedDog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** Alias for ComposedPets */
export type ComposedPets = SpreadCat | CopiedDog;

export function composedPetsSerializer(item: ComposedPets): any {
  return item;
}

export function composedPetsDeserializer(item: any): ComposedPets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  ComposedPets,
  composedPetsSerializer,
  composedPetsDeserializer,
} from "../models/models.js";
import { SendPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendPetSend(
  context: Client,
  pet: ComposedPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/composed-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: composedPetsSerializer(pet),
  });
}

export async function _sendPetDeserialize(result: PathUncheckedResponse): Promise<ComposedPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return composedPetsDeserializer(result.body);
}

export async function sendPet(
  context: Client,
  pet: ComposedPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): Promise<ComposedPets> {
  const result = await _sendPetSend(context, pet, options);
  return _sendPetDeserialize(result);
}
```

# UE04: Transitive inheritance and different compatible ancestry

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Mammal extends Named {
  age: int32;
}
model YoungCat extends Mammal {
  meow: boolean;
}
model OtherBase {
  name: string;
  origin: string;
}
model OtherDog extends OtherBase {
  bark: boolean;
}
union RelatedPets extends Named {
  cat: YoungCat,
  dog: OtherDog,
}

@route("/related-pets")
@post
op sendPet(@body pet: RelatedPets): RelatedPets;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface YoungCat */
export interface YoungCat extends Mammal {
  meow: boolean;
}

export function youngCatSerializer(item: YoungCat): any {
  return { age: item["age"], name: item["name"], meow: item["meow"] };
}

export function youngCatDeserializer(item: any): YoungCat {
  return {
    age: item["age"],
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Mammal */
export interface Mammal extends Named {
  age: number;
}

export function mammalSerializer(item: Mammal): any {
  return { name: item["name"], age: item["age"] };
}

export function mammalDeserializer(item: any): Mammal {
  return {
    name: item["name"],
    age: item["age"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface OtherDog */
export interface OtherDog extends OtherBase {
  bark: boolean;
}

export function otherDogSerializer(item: OtherDog): any {
  return { name: item["name"], origin: item["origin"], bark: item["bark"] };
}

export function otherDogDeserializer(item: any): OtherDog {
  return {
    name: item["name"],
    origin: item["origin"],
    bark: item["bark"],
  };
}

/** model interface OtherBase */
export interface OtherBase {
  name: string;
  origin: string;
}

export function otherBaseSerializer(item: OtherBase): any {
  return { name: item["name"], origin: item["origin"] };
}

export function otherBaseDeserializer(item: any): OtherBase {
  return {
    name: item["name"],
    origin: item["origin"],
  };
}

/** Alias for RelatedPets */
export type RelatedPets = YoungCat | OtherDog;

export function relatedPetsSerializer(item: RelatedPets): any {
  return item;
}

export function relatedPetsDeserializer(item: any): RelatedPets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import { RelatedPets, relatedPetsSerializer, relatedPetsDeserializer } from "../models/models.js";
import { SendPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendPetSend(
  context: Client,
  pet: RelatedPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/related-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: relatedPetsSerializer(pet),
  });
}

export async function _sendPetDeserialize(result: PathUncheckedResponse): Promise<RelatedPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return relatedPetsDeserializer(result.body);
}

export async function sendPet(
  context: Client,
  pet: RelatedPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): Promise<RelatedPets> {
  const result = await _sendPetSend(context, pet, options);
  return _sendPetDeserialize(result);
}
```

# UE05: One variant in two unions with the same base

Both operations expose the reused Cat model through different unions.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Dog extends Named {
  bark: boolean;
}
model Bird extends Named {
  wings: int32;
}
union IndoorPets extends Named {
  cat: Cat,
  dog: Dog,
}
union OutdoorPets extends Named {
  cat: Cat,
  bird: Bird,
}

@route("/indoor-pets")
@post
op sendIndoorPet(@body pet: IndoorPets): IndoorPets;

@route("/outdoor-pets")
@post
op sendOutdoorPet(@body pet: OutdoorPets): OutdoorPets;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Named {
  bark: boolean;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** model interface Bird */
export interface Bird extends Named {
  wings: number;
}

export function birdSerializer(item: Bird): any {
  return { name: item["name"], wings: item["wings"] };
}

export function birdDeserializer(item: any): Bird {
  return {
    name: item["name"],
    wings: item["wings"],
  };
}

/** Alias for IndoorPets */
export type IndoorPets = Cat | Dog;

export function indoorPetsSerializer(item: IndoorPets): any {
  return item;
}

export function indoorPetsDeserializer(item: any): IndoorPets {
  return item;
}

/** Alias for OutdoorPets */
export type OutdoorPets = Cat | Bird;

export function outdoorPetsSerializer(item: OutdoorPets): any {
  return item;
}

export function outdoorPetsDeserializer(item: any): OutdoorPets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  IndoorPets,
  indoorPetsSerializer,
  indoorPetsDeserializer,
  OutdoorPets,
  outdoorPetsSerializer,
  outdoorPetsDeserializer,
} from "../models/models.js";
import { SendOutdoorPetOptionalParams, SendIndoorPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendOutdoorPetSend(
  context: Client,
  pet: OutdoorPets,
  options: SendOutdoorPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/outdoor-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: outdoorPetsSerializer(pet),
  });
}

export async function _sendOutdoorPetDeserialize(
  result: PathUncheckedResponse,
): Promise<OutdoorPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return outdoorPetsDeserializer(result.body);
}

export async function sendOutdoorPet(
  context: Client,
  pet: OutdoorPets,
  options: SendOutdoorPetOptionalParams = { requestOptions: {} },
): Promise<OutdoorPets> {
  const result = await _sendOutdoorPetSend(context, pet, options);
  return _sendOutdoorPetDeserialize(result);
}

export function _sendIndoorPetSend(
  context: Client,
  pet: IndoorPets,
  options: SendIndoorPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/indoor-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: indoorPetsSerializer(pet),
  });
}

export async function _sendIndoorPetDeserialize(
  result: PathUncheckedResponse,
): Promise<IndoorPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return indoorPetsDeserializer(result.body);
}

export async function sendIndoorPet(
  context: Client,
  pet: IndoorPets,
  options: SendIndoorPetOptionalParams = { requestOptions: {} },
): Promise<IndoorPets> {
  const result = await _sendIndoorPetSend(context, pet, options);
  return _sendIndoorPetDeserialize(result);
}
```

# UE06: Disjoint variants with the same base, not all descendants

Each union selects only its own alternatives, not every descendant of Named.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Dog extends Named {
  bark: boolean;
}
model Bird extends Named {
  wings: int32;
}
model Fish extends Named {
  fins: int32;
}
union WalkingPets extends Named {
  cat: Cat,
  dog: Dog,
}
union OtherPets extends Named {
  bird: Bird,
  fish: Fish,
}

@route("/walking-pets")
@post
op sendWalkingPet(@body pet: WalkingPets): WalkingPets;

@route("/other-pets")
@post
op sendOtherPet(@body pet: OtherPets): OtherPets;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Named {
  bark: boolean;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** model interface Bird */
export interface Bird extends Named {
  wings: number;
}

export function birdSerializer(item: Bird): any {
  return { name: item["name"], wings: item["wings"] };
}

export function birdDeserializer(item: any): Bird {
  return {
    name: item["name"],
    wings: item["wings"],
  };
}

/** model interface Fish */
export interface Fish extends Named {
  fins: number;
}

export function fishSerializer(item: Fish): any {
  return { name: item["name"], fins: item["fins"] };
}

export function fishDeserializer(item: any): Fish {
  return {
    name: item["name"],
    fins: item["fins"],
  };
}

/** Alias for WalkingPets */
export type WalkingPets = Cat | Dog;

export function walkingPetsSerializer(item: WalkingPets): any {
  return item;
}

export function walkingPetsDeserializer(item: any): WalkingPets {
  return item;
}

/** Alias for OtherPets */
export type OtherPets = Bird | Fish;

export function otherPetsSerializer(item: OtherPets): any {
  return item;
}

export function otherPetsDeserializer(item: any): OtherPets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  WalkingPets,
  walkingPetsSerializer,
  walkingPetsDeserializer,
  OtherPets,
  otherPetsSerializer,
  otherPetsDeserializer,
} from "../models/models.js";
import { SendOtherPetOptionalParams, SendWalkingPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendOtherPetSend(
  context: Client,
  pet: OtherPets,
  options: SendOtherPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/other-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: otherPetsSerializer(pet),
  });
}

export async function _sendOtherPetDeserialize(result: PathUncheckedResponse): Promise<OtherPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return otherPetsDeserializer(result.body);
}

export async function sendOtherPet(
  context: Client,
  pet: OtherPets,
  options: SendOtherPetOptionalParams = { requestOptions: {} },
): Promise<OtherPets> {
  const result = await _sendOtherPetSend(context, pet, options);
  return _sendOtherPetDeserialize(result);
}

export function _sendWalkingPetSend(
  context: Client,
  pet: WalkingPets,
  options: SendWalkingPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/walking-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: walkingPetsSerializer(pet),
  });
}

export async function _sendWalkingPetDeserialize(
  result: PathUncheckedResponse,
): Promise<WalkingPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return walkingPetsDeserializer(result.body);
}

export async function sendWalkingPet(
  context: Client,
  pet: WalkingPets,
  options: SendWalkingPetOptionalParams = { requestOptions: {} },
): Promise<WalkingPets> {
  const result = await _sendWalkingPetSend(context, pet, options);
  return _sendWalkingPetDeserialize(result);
}
```

# UE07: One variant satisfies two different named bases

SharedPet is reused without nominal inheritance from either constraint.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Identified {
  id: int32;
}
model SharedPet {
  name: string;
  id: int32;
  active: boolean;
}
model Device extends Identified {
  serial: string;
}
union NamedThings extends Named {
  shared: SharedPet,
  cat: Cat,
}
union IdentifiedThings extends Identified {
  shared: SharedPet,
  device: Device,
}

@route("/named-things")
@post
op sendNamedThing(@body thing: NamedThings): NamedThings;

@route("/identified-things")
@post
op sendIdentifiedThing(@body thing: IdentifiedThings): IdentifiedThings;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface SharedPet */
export interface SharedPet {
  name: string;
  id: number;
  active: boolean;
}

export function sharedPetSerializer(item: SharedPet): any {
  return { name: item["name"], id: item["id"], active: item["active"] };
}

export function sharedPetDeserializer(item: any): SharedPet {
  return {
    name: item["name"],
    id: item["id"],
    active: item["active"],
  };
}

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Device */
export interface Device extends Identified {
  serial: string;
}

export function deviceSerializer(item: Device): any {
  return { id: item["id"], serial: item["serial"] };
}

export function deviceDeserializer(item: any): Device {
  return {
    id: item["id"],
    serial: item["serial"],
  };
}

/** model interface Identified */
export interface Identified {
  id: number;
}

export function identifiedSerializer(item: Identified): any {
  return { id: item["id"] };
}

export function identifiedDeserializer(item: any): Identified {
  return {
    id: item["id"],
  };
}

/** Alias for NamedThings */
export type NamedThings = SharedPet | Cat;

export function namedThingsSerializer(item: NamedThings): any {
  return item;
}

export function namedThingsDeserializer(item: any): NamedThings {
  return item;
}

/** Alias for IdentifiedThings */
export type IdentifiedThings = SharedPet | Device;

export function identifiedThingsSerializer(item: IdentifiedThings): any {
  return item;
}

export function identifiedThingsDeserializer(item: any): IdentifiedThings {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  NamedThings,
  namedThingsSerializer,
  namedThingsDeserializer,
  IdentifiedThings,
  identifiedThingsSerializer,
  identifiedThingsDeserializer,
} from "../models/models.js";
import { SendIdentifiedThingOptionalParams, SendNamedThingOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendIdentifiedThingSend(
  context: Client,
  thing: IdentifiedThings,
  options: SendIdentifiedThingOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/identified-things").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: identifiedThingsSerializer(thing),
  });
}

export async function _sendIdentifiedThingDeserialize(
  result: PathUncheckedResponse,
): Promise<IdentifiedThings> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return identifiedThingsDeserializer(result.body);
}

export async function sendIdentifiedThing(
  context: Client,
  thing: IdentifiedThings,
  options: SendIdentifiedThingOptionalParams = { requestOptions: {} },
): Promise<IdentifiedThings> {
  const result = await _sendIdentifiedThingSend(context, thing, options);
  return _sendIdentifiedThingDeserialize(result);
}

export function _sendNamedThingSend(
  context: Client,
  thing: NamedThings,
  options: SendNamedThingOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/named-things").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: namedThingsSerializer(thing),
  });
}

export async function _sendNamedThingDeserialize(
  result: PathUncheckedResponse,
): Promise<NamedThings> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return namedThingsDeserializer(result.body);
}

export async function sendNamedThing(
  context: Client,
  thing: NamedThings,
  options: SendNamedThingOptionalParams = { requestOptions: {} },
): Promise<NamedThings> {
  const result = await _sendNamedThingSend(context, thing, options);
  return _sendNamedThingDeserialize(result);
}
```

# UE08: The same variant used through a union and directly

The operation and property contexts both expose direct Cat use alongside Pets.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Dog extends Named {
  bark: boolean;
}
union Pets extends Named {
  cat: Cat,
  dog: Dog,
}
model Holder {
  pet: Pets;
  cat: Cat;
}

@route("/pets")
@post
op sendPet(@body pet: Pets): Pets;

@route("/cats")
@post
op sendCat(@body cat: Cat): Cat;

@route("/holders")
@post
op sendHolder(@body holder: Holder): Holder;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Named {
  bark: boolean;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** model interface Holder */
export interface Holder {
  pet: Pets;
  cat: Cat;
}

export function holderSerializer(item: Holder): any {
  return { pet: petsSerializer(item["pet"]), cat: catSerializer(item["cat"]) };
}

export function holderDeserializer(item: any): Holder {
  return {
    pet: petsDeserializer(item["pet"]),
    cat: catDeserializer(item["cat"]),
  };
}

/** Alias for Pets */
export type Pets = Cat | Dog;

export function petsSerializer(item: Pets): any {
  return item;
}

export function petsDeserializer(item: any): Pets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  Cat,
  catSerializer,
  catDeserializer,
  Holder,
  holderSerializer,
  holderDeserializer,
  Pets,
  petsSerializer,
  petsDeserializer,
} from "../models/models.js";
import {
  SendHolderOptionalParams,
  SendCatOptionalParams,
  SendPetOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendHolderSend(
  context: Client,
  holder: Holder,
  options: SendHolderOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/holders").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: holderSerializer(holder),
  });
}

export async function _sendHolderDeserialize(result: PathUncheckedResponse): Promise<Holder> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return holderDeserializer(result.body);
}

export async function sendHolder(
  context: Client,
  holder: Holder,
  options: SendHolderOptionalParams = { requestOptions: {} },
): Promise<Holder> {
  const result = await _sendHolderSend(context, holder, options);
  return _sendHolderDeserialize(result);
}

export function _sendCatSend(
  context: Client,
  cat: Cat,
  options: SendCatOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/cats").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: catSerializer(cat),
  });
}

export async function _sendCatDeserialize(result: PathUncheckedResponse): Promise<Cat> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return catDeserializer(result.body);
}

export async function sendCat(
  context: Client,
  cat: Cat,
  options: SendCatOptionalParams = { requestOptions: {} },
): Promise<Cat> {
  const result = await _sendCatSend(context, cat, options);
  return _sendCatDeserialize(result);
}

export function _sendPetSend(
  context: Client,
  pet: Pets,
  options: SendPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: petsSerializer(pet),
  });
}

export async function _sendPetDeserialize(result: PathUncheckedResponse): Promise<Pets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petsDeserializer(result.body);
}

export async function sendPet(
  context: Client,
  pet: Pets,
  options: SendPetOptionalParams = { requestOptions: {} },
): Promise<Pets> {
  const result = await _sendPetSend(context, pet, options);
  return _sendPetDeserialize(result);
}
```

# UE09: Explicitly include the base as a named alternative

The base is an explicitly listed alternative, not an implicit default.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
union PetOrBase extends Named {
  cat: Cat,
  base: Named,
}

@route("/pet-or-base")
@post
op sendPet(@body pet: PetOrBase): PetOrBase;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** Alias for PetOrBase */
export type PetOrBase = Cat | Named;

export function petOrBaseSerializer(item: PetOrBase): any {
  return item;
}

export function petOrBaseDeserializer(item: any): PetOrBase {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import { PetOrBase, petOrBaseSerializer, petOrBaseDeserializer } from "../models/models.js";
import { SendPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendPetSend(
  context: Client,
  pet: PetOrBase,
  options: SendPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/pet-or-base").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: petOrBaseSerializer(pet),
  });
}

export async function _sendPetDeserialize(result: PathUncheckedResponse): Promise<PetOrBase> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petOrBaseDeserializer(result.body);
}

export async function sendPet(
  context: Client,
  pet: PetOrBase,
  options: SendPetOptionalParams = { requestOptions: {} },
): Promise<PetOrBase> {
  const result = await _sendPetSend(context, pet, options);
  return _sendPetDeserialize(result);
}
```

# UE10: Explicit unnamed default retains an unknown tag and modeled data

The inline discriminator is independently declared by @discriminated, not by
the extends constraint. The object-envelope default question is out of scope.

The current snapshots emit an ordinary union and pass-through union serializers.
They do not inject literal `kind` properties into Cat or Dog. Successful generation
here does not establish support for the intended inline discriminator/default
wire behavior. Removing the union's extends constraint produces identical output;
this is an existing union-level discriminator support gap, not caused by extends.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Dog extends Named {
  bark: boolean;
}
model UnknownPet extends Named {
  kind: string;
  extra: Record<unknown>;
}
@discriminated(#{ envelope: "none" })
union OpenPets extends Named {
  cat: Cat,
  dog: Dog,
  UnknownPet,
}

@route("/open-pets")
@post
op sendPet(@body pet: OpenPets): OpenPets;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Named {
  bark: boolean;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** model interface UnknownPet */
export interface UnknownPet extends Named {
  kind: string;
  extra: Record<string, any>;
}

export function unknownPetSerializer(item: UnknownPet): any {
  return { name: item["name"], kind: item["kind"], extra: item["extra"] };
}

export function unknownPetDeserializer(item: any): UnknownPet {
  return {
    name: item["name"],
    kind: item["kind"],
    extra: Object.fromEntries(Object.entries(item["extra"]).map(([k, p]: [string, any]) => [k, p])),
  };
}

/** Alias for OpenPets */
export type OpenPets = Cat | Dog | UnknownPet;

export function openPetsSerializer(item: OpenPets): any {
  return item;
}

export function openPetsDeserializer(item: any): OpenPets {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import { OpenPets, openPetsSerializer, openPetsDeserializer } from "../models/models.js";
import { SendPetOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendPetSend(
  context: Client,
  pet: OpenPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/open-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: openPetsSerializer(pet),
  });
}

export async function _sendPetDeserialize(result: PathUncheckedResponse): Promise<OpenPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return openPetsDeserializer(result.body);
}

export async function sendPet(
  context: Client,
  pet: OpenPets,
  options: SendPetOptionalParams = { requestOptions: {} },
): Promise<OpenPets> {
  const result = await _sendPetSend(context, pet, options);
  return _sendPetDeserialize(result);
}
```

# UE11: Nested variant versus named and anonymous union constraints

All three unions are reachable. The nested variant remains a union in TypeSpec;
any flattened SDK representation is an emitter decision.

MixedValues uses the inferred `text/plain` wire format. Its pass-through deserializer
does not convert numeric text back into a number; preserving the string versus
numeric alternative in a round trip would require an explicit wire contract such
as JSON. This snapshot checks the generated representation, not that round trip.

```yaml
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Dog extends Named {
  bark: boolean;
}
model Bird extends Named {
  wings: int32;
}
union Pets extends Named {
  cat: Cat,
  dog: Dog,
}
union NestedPets extends Named {
  pets: Pets,
  bird: Bird,
}
union ConstrainedPets extends Pets {
  cat: Cat,
  dog: Dog,
}
union MixedValues extends string | int32 {
  text: string,
  number: int32,
}

@route("/nested-pets")
@post
op sendNestedPet(@body pet: NestedPets): NestedPets;

@route("/constrained-pets")
@post
op sendConstrainedPet(@body pet: ConstrainedPets): ConstrainedPets;

@route("/mixed-values")
@post
op sendMixedValue(@body value: MixedValues): MixedValues;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Named {
  bark: boolean;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** model interface Bird */
export interface Bird extends Named {
  wings: number;
}

export function birdSerializer(item: Bird): any {
  return { name: item["name"], wings: item["wings"] };
}

export function birdDeserializer(item: any): Bird {
  return {
    name: item["name"],
    wings: item["wings"],
  };
}

/** Alias for NestedPets */
export type NestedPets = Pets | Bird;

export function nestedPetsSerializer(item: NestedPets): any {
  return item;
}

export function nestedPetsDeserializer(item: any): NestedPets {
  return item;
}

/** Alias for Pets */
export type Pets = Cat | Dog;

export function petsSerializer(item: Pets): any {
  return item;
}

export function petsDeserializer(item: any): Pets {
  return item;
}

/** Alias for ConstrainedPets */
export type ConstrainedPets = Cat | Dog;

export function constrainedPetsSerializer(item: ConstrainedPets): any {
  return item;
}

export function constrainedPetsDeserializer(item: any): ConstrainedPets {
  return item;
}

/** Alias for MixedValues */
export type MixedValues = string | number;

export function mixedValuesSerializer(item: MixedValues): any {
  return item;
}

export function mixedValuesDeserializer(item: any): MixedValues {
  return item;
}
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  NestedPets,
  nestedPetsSerializer,
  nestedPetsDeserializer,
  ConstrainedPets,
  constrainedPetsSerializer,
  constrainedPetsDeserializer,
  MixedValues,
  mixedValuesSerializer,
  mixedValuesDeserializer,
} from "../models/models.js";
import {
  SendMixedValueOptionalParams,
  SendConstrainedPetOptionalParams,
  SendNestedPetOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendMixedValueSend(
  context: Client,
  value: MixedValues,
  options: SendMixedValueOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/mixed-values").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: mixedValuesSerializer(value),
  });
}

export async function _sendMixedValueDeserialize(
  result: PathUncheckedResponse,
): Promise<MixedValues> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return mixedValuesDeserializer(result.body);
}

export async function sendMixedValue(
  context: Client,
  value: MixedValues,
  options: SendMixedValueOptionalParams = { requestOptions: {} },
): Promise<MixedValues> {
  const result = await _sendMixedValueSend(context, value, options);
  return _sendMixedValueDeserialize(result);
}

export function _sendConstrainedPetSend(
  context: Client,
  pet: ConstrainedPets,
  options: SendConstrainedPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/constrained-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: constrainedPetsSerializer(pet),
  });
}

export async function _sendConstrainedPetDeserialize(
  result: PathUncheckedResponse,
): Promise<ConstrainedPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return constrainedPetsDeserializer(result.body);
}

export async function sendConstrainedPet(
  context: Client,
  pet: ConstrainedPets,
  options: SendConstrainedPetOptionalParams = { requestOptions: {} },
): Promise<ConstrainedPets> {
  const result = await _sendConstrainedPetSend(context, pet, options);
  return _sendConstrainedPetDeserialize(result);
}

export function _sendNestedPetSend(
  context: Client,
  pet: NestedPets,
  options: SendNestedPetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/nested-pets").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: nestedPetsSerializer(pet),
  });
}

export async function _sendNestedPetDeserialize(
  result: PathUncheckedResponse,
): Promise<NestedPets> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return nestedPetsDeserializer(result.body);
}

export async function sendNestedPet(
  context: Client,
  pet: NestedPets,
  options: SendNestedPetOptionalParams = { requestOptions: {} },
): Promise<NestedPets> {
  const result = await _sendNestedPetSend(context, pet, options);
  return _sendNestedPetDeserialize(result);
}
```

# UE12: Scalar, enum, array, intersection, and template bases

Every example from UE12 is reachable. PetArrays describes homogeneous Cat arrays
or homogeneous Dog arrays, not an array of mixed alternatives.

The modular-unit default disables `experimental-extensible-enums`, explicitly
recorded below. With this setting, the current emitter represents OpenStatus as
`"known"` rather than `string`; the snapshot records this behavior rather than
asserting it is a faithful representation of the TypeSpec's open union.

```yaml
experimental-extensible-enums: false
compilerOptions:
  configFile:
    projectRoot: "."
    kind: project
    features: [union-extends]
    diagnostics: []
    outputDir: tsp-output
```

```tsp
model Named {
  name: string;
}
model Cat extends Named {
  meow: boolean;
}
model Dog extends Named {
  bark: boolean;
}
model Identified {
  id: int32;
}
model SharedPet {
  name: string;
  id: int32;
  active: boolean;
}
union ClosedStatus extends string {
  start: "start",
  stop: "stop",
}
union OpenStatus extends string {
  known: "known",
  custom: string,
}
enum Direction {
  left,
  right,
}
union Directions extends Direction {
  left: Direction.left,
  right: Direction.right,
}
union PetArrays extends Named[] {
  cats: Cat[],
  dogs: Dog[],
}
union Combined extends Named & Identified {
  shared: SharedPet,
}
model Wrapper<T> {
  item: T;
}
union Wrapped extends Wrapper<string> {
  value: Wrapper<string>,
}

@route("/closed-status")
@post
op sendClosedStatus(@body status: ClosedStatus): ClosedStatus;

@route("/open-status")
@post
op sendOpenStatus(@body status: OpenStatus): OpenStatus;

@route("/directions")
@post
op sendDirection(@body direction: Directions): Directions;

@route("/pet-arrays")
@post
op sendPetArray(@body pets: PetArrays): PetArrays;

@route("/combined")
@post
op sendCombined(@body value: Combined): Combined;

@route("/wrapped")
@post
op sendWrapped(@body value: Wrapped): Wrapped;
```

```ts models
/*
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/** model interface Cat */
export interface Cat extends Named {
  meow: boolean;
}

export function catSerializer(item: Cat): any {
  return { name: item["name"], meow: item["meow"] };
}

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    meow: item["meow"],
  };
}

/** model interface Named */
export interface Named {
  name: string;
}

export function namedSerializer(item: Named): any {
  return { name: item["name"] };
}

export function namedDeserializer(item: any): Named {
  return {
    name: item["name"],
  };
}

/** model interface Dog */
export interface Dog extends Named {
  bark: boolean;
}

export function dogSerializer(item: Dog): any {
  return { name: item["name"], bark: item["bark"] };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    bark: item["bark"],
  };
}

/** model interface SharedPet */
export interface SharedPet {
  name: string;
  id: number;
  active: boolean;
}

export function sharedPetSerializer(item: SharedPet): any {
  return { name: item["name"], id: item["id"], active: item["active"] };
}

export function sharedPetDeserializer(item: any): SharedPet {
  return {
    name: item["name"],
    id: item["id"],
    active: item["active"],
  };
}

/** model interface Wrapper */
export interface Wrapper {
  item: string;
}

export function wrapperSerializer(item: Wrapper): any {
  return { item: item["item"] };
}

export function wrapperDeserializer(item: any): Wrapper {
  return {
    item: item["item"],
  };
}

/** Alias for Directions */
export type Directions = "left" | "right";

export function directionsSerializer(item: Directions): any {
  return item;
}

export function directionsDeserializer(item: any): Directions {
  return item;
}

/** Alias for PetArrays */
export type PetArrays = Cat[] | Dog[];

export function petArraysSerializer(item: PetArrays): any {
  return item;
}

export function petArraysDeserializer(item: any): PetArrays {
  return item;
}

export function catArraySerializer(result: Array<Cat>): any[] {
  return result.map((item) => {
    return catSerializer(item);
  });
}

export function catArrayDeserializer(result: Array<Cat>): any[] {
  return result.map((item) => {
    return catDeserializer(item);
  });
}

export function dogArraySerializer(result: Array<Dog>): any[] {
  return result.map((item) => {
    return dogSerializer(item);
  });
}

export function dogArrayDeserializer(result: Array<Dog>): any[] {
  return result.map((item) => {
    return dogDeserializer(item);
  });
}

/** Alias for Combined */
export type Combined = SharedPet;

export function combinedSerializer(item: Combined): any {
  return item;
}

/** Alias for Wrapped */
export type Wrapped = Wrapper;

export function wrappedSerializer(item: Wrapped): any {
  return item;
}

/** Type of ClosedStatus */
export type ClosedStatus = "start" | "stop";

/** Type of OpenStatus */
export type OpenStatus = "known";

/** Type of Direction */
export type Direction = "left" | "right";
```

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  SharedPet,
  sharedPetDeserializer,
  Wrapper,
  wrapperDeserializer,
  Directions,
  directionsSerializer,
  directionsDeserializer,
  PetArrays,
  petArraysSerializer,
  petArraysDeserializer,
  Combined,
  combinedSerializer,
  Wrapped,
  wrappedSerializer,
  ClosedStatus,
  OpenStatus,
} from "../models/models.js";
import {
  SendWrappedOptionalParams,
  SendCombinedOptionalParams,
  SendPetArrayOptionalParams,
  SendDirectionOptionalParams,
  SendOpenStatusOptionalParams,
  SendClosedStatusOptionalParams,
} from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _sendWrappedSend(
  context: Client,
  value: Wrapped,
  options: SendWrappedOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/wrapped").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: wrappedSerializer(value),
  });
}

export async function _sendWrappedDeserialize(result: PathUncheckedResponse): Promise<Wrapper> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return wrapperDeserializer(result.body);
}

export async function sendWrapped(
  context: Client,
  value: Wrapped,
  options: SendWrappedOptionalParams = { requestOptions: {} },
): Promise<Wrapper> {
  const result = await _sendWrappedSend(context, value, options);
  return _sendWrappedDeserialize(result);
}

export function _sendCombinedSend(
  context: Client,
  value: Combined,
  options: SendCombinedOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/combined").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: combinedSerializer(value),
  });
}

export async function _sendCombinedDeserialize(result: PathUncheckedResponse): Promise<SharedPet> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return sharedPetDeserializer(result.body);
}

export async function sendCombined(
  context: Client,
  value: Combined,
  options: SendCombinedOptionalParams = { requestOptions: {} },
): Promise<SharedPet> {
  const result = await _sendCombinedSend(context, value, options);
  return _sendCombinedDeserialize(result);
}

export function _sendPetArraySend(
  context: Client,
  pets: PetArrays,
  options: SendPetArrayOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/pet-arrays").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: petArraysSerializer(pets),
  });
}

export async function _sendPetArrayDeserialize(result: PathUncheckedResponse): Promise<PetArrays> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petArraysDeserializer(result.body);
}

export async function sendPetArray(
  context: Client,
  pets: PetArrays,
  options: SendPetArrayOptionalParams = { requestOptions: {} },
): Promise<PetArrays> {
  const result = await _sendPetArraySend(context, pets, options);
  return _sendPetArrayDeserialize(result);
}

export function _sendDirectionSend(
  context: Client,
  direction: Directions,
  options: SendDirectionOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/directions").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: directionsSerializer(direction),
  });
}

export async function _sendDirectionDeserialize(
  result: PathUncheckedResponse,
): Promise<Directions> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return directionsDeserializer(result.body);
}

export async function sendDirection(
  context: Client,
  direction: Directions,
  options: SendDirectionOptionalParams = { requestOptions: {} },
): Promise<Directions> {
  const result = await _sendDirectionSend(context, direction, options);
  return _sendDirectionDeserialize(result);
}

export function _sendOpenStatusSend(
  context: Client,
  status: OpenStatus,
  options: SendOpenStatusOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/open-status").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: status,
  });
}

export async function _sendOpenStatusDeserialize(
  result: PathUncheckedResponse,
): Promise<OpenStatus> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function sendOpenStatus(
  context: Client,
  status: OpenStatus,
  options: SendOpenStatusOptionalParams = { requestOptions: {} },
): Promise<OpenStatus> {
  const result = await _sendOpenStatusSend(context, status, options);
  return _sendOpenStatusDeserialize(result);
}

export function _sendClosedStatusSend(
  context: Client,
  status: ClosedStatus,
  options: SendClosedStatusOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/closed-status").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: status,
  });
}

export async function _sendClosedStatusDeserialize(
  result: PathUncheckedResponse,
): Promise<ClosedStatus> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function sendClosedStatus(
  context: Client,
  status: ClosedStatus,
  options: SendClosedStatusOptionalParams = { requestOptions: {} },
): Promise<ClosedStatus> {
  const result = await _sendClosedStatusSend(context, status, options);
  return _sendClosedStatusDeserialize(result);
}
```
