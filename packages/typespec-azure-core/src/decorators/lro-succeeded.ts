import type { LroSucceededDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys } from "../lib.js";
import { createMarkerDecorator } from "./utils.js";

export const [
  /**
   *  Returns `true` if the enum member represents a "succeeded" state.
   */
  isLroSucceededState,
  markLroSucceeded,
  /** {@inheritdoc LroSucceededDecorator} */
  $lroSucceeded,
] = createMarkerDecorator<LroSucceededDecorator>(AzureCoreStateKeys.lroSucceeded);
