// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Project } from "ts-morph";
import { RLCModel } from "../interfaces.js";

export function buildApiExtractorConfig(_model: RLCModel) {
  const project = new Project({ useInMemoryFileSystem: true });

  const config = {
    extends: "../../../api-extractor-base.json",
  };

  const filePath = "api-extractor.json";
  const configFile = project.createSourceFile(filePath, JSON.stringify(config), {
    overwrite: true,
  });
  return {
    path: filePath,
    content: configFile.getFullText(),
  };
}
