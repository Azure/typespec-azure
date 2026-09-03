/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";

/**
 * Returns the emitted package's path relative to its containing module root
 * when the output directory is within that root.
 *
 * @param moduleRoot the directory containing the module's go.mod
 * @param emitterOutputDir the directory receiving generated files
 * @returns the module-relative package path, or undefined when it cannot be calculated
 */
export function getContainingModuleRelativePackagePath(
  moduleRoot: string | undefined,
  emitterOutputDir: string,
): string | undefined {
  if (!moduleRoot) {
    return undefined;
  }

  const relativePath = path.relative(moduleRoot, emitterOutputDir);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return undefined;
  }

  return relativePath.split(path.sep).join("/");
}
