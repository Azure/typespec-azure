// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { PackageCommonInfoConfig } from "./package-common.js";

export interface AzurePackageInfoConfig extends PackageCommonInfoConfig {
  hasLro: boolean;
}

/**
 * Build the common package.json config for an Azure package.
 */
export function getAzureCommonPackageInfo(_config: AzurePackageInfoConfig) {
  return {
    keywords: ["node", "azure", "cloud", "typescript", "browser", "isomorphic"],
    author: "Microsoft Corporation",
    license: "MIT",
    files: ["dist/", "!dist/**/*.d.*ts.map", "README.md", "LICENSE"],
  };
}
