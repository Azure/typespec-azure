// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export { DiscriminatedServiceClient } from "./discriminatedServiceClient.js";
export type {
  Cat,
  Pet,
  PetUnion,
  Dog,
  PetCreate,
  PetCreateUnion,
  CatCreate,
  DogCreate,
} from "./models/index.js";
export type {
  DiscriminatedServiceClientOptionalParams,
  CreatePetOptionalParams,
  CreateCatOptionalParams,
} from "./api/index.js";
export { RestError, isRestError } from "@azure/core-rest-pipeline";
