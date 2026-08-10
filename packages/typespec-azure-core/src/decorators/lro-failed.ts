import type { LroFailedDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys } from "../lib.js";
import { createMarkerDecorator } from "./utils.js";

export const [
  /**
   *  Returns `true` if the enum member represents a "failed" state.
   */
  isLroFailedState,
  markLroFailed,
  /** {@inheritdoc LroFailedDecorator} */
  $lroFailed,
] = createMarkerDecorator<LroFailedDecorator>(AzureCoreStateKeys.lroFailed);
