/** An error here would mean that the decorator is not exported or doesn't have the right name. */
import {
  $trait,
  $traitAdded,
  $traitContext,
  $traitLocation,
} from "@azure-tools/typespec-azure-core";
import type {
  TraitAddedDecorator,
  TraitContextDecorator,
  TraitDecorator,
  TraitLocationDecorator,
} from "./Azure.Core.Traits.js";

type Decorators = {
  $trait: TraitDecorator;
  $traitLocation: TraitLocationDecorator;
  $traitContext: TraitContextDecorator;
  $traitAdded: TraitAddedDecorator;
};

/** An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ... */
const _: Decorators = {
  $trait,
  $traitLocation,
  $traitContext,
  $traitAdded,
};
