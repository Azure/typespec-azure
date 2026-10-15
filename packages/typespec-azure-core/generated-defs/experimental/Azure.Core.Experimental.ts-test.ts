// An error in the imports would mean that the decorator is not exported or
// doesn't have the right name.

import { $decorators } from "@azure-tools/typespec-azure-core/experimental";
import type { AzureCoreExperimentalDecorators } from "./Azure.Core.Experimental.js";

/**
 * An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ...
 */
const _decs: AzureCoreExperimentalDecorators = $decorators["Azure.Core.Experimental"];
