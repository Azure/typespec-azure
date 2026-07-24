/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as tcgc from "@azure-tools/typespec-client-generator-core";
import { existsSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Locates this emitter's own package.json version by walking up from the current
 * module directory. Walking up (rather than using a fixed relative path) keeps
 * this working across both the built layout and when the emitter is loaded from
 * source (for example under vitest).
 */
function getEmitterVersion(): string | undefined {
  const require = createRequire(import.meta.url);
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      const pkg = require(candidate) as Record<string, unknown>;
      if (pkg["name"] === "@azure-tools/typespec-go") {
        return pkg["version"] as string | undefined;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

/**
 * Build the package metadata from the TCGC SDK package metadata.
 *
 * @param metadata the TCGC SDK package metadata
 * @returns the metadata object for the code model
 */
export function buildMetadata(
  metadata: tcgc.SdkPackage<tcgc.SdkHttpOperation>["metadata"],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (metadata.apiVersions && metadata.apiVersions.size > 0) {
    result.apiVersions = Object.fromEntries(metadata.apiVersions);
  }

  result.emitterVersion = getEmitterVersion();

  return result;
}
