import type { LroCanceledDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys } from "../lib.js";
import { createMarkerDecorator } from "./utils.js";

export const [
  /**
   *  Returns `true` if the enum member represents a "canceled" state.
   */
  isLroCanceledState,
  markLroCanceled,
  /** {@inheritdoc LroCanceledDecorator} */
  $lroCanceled,
] = createMarkerDecorator<LroCanceledDecorator>(AzureCoreStateKeys.lroCanceled);
