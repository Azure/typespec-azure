/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import type { ContainingModule } from "./codemodel/index.js";

/**
 * Sets the emitted package's path relative to its containing module root when
 * the output directory is within that root. Otherwise, the caller's fallback
 * remains in effect.
 *
 * @param module the containing module to update
 * @param moduleRoot the directory containing the module's go.mod
 * @param emitterOutputDir the directory receiving generated files
 */
export function setContainingModuleRelativePackagePath(
  module: ContainingModule,
  moduleRoot: string | undefined,
  emitterOutputDir: string,
): void {
  if (!moduleRoot) {
    return;
  }

  const relativePath = path.relative(moduleRoot, emitterOutputDir);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return;
  }

  module.relativePackagePath = relativePath.split(path.sep).join("/");
}
