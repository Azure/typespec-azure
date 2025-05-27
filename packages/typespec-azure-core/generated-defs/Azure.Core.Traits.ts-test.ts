// An error in the imports would mean that the decorator is not exported or
// doesn't have the right name.

import { $decorators } from "@azure-tools/typespec-azure-core";
import type { AzureCoreTraitsDecorators } from "./Azure.Core.Traits.js";

/**
 * An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ...
 */
const _: AzureCoreTraitsDecorators = $decorators["Azure.Core.Traits"];
