// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { joinPaths } from "@typespec/compiler";
import { Project } from "ts-morph";
import { RLCModel } from "./interfaces.js";

export function buildLogger(model: RLCModel) {
  if (!model.options) {
    return undefined;
  }
  const project = new Project({ useInMemoryFileSystem: true });
  const { rlcSourceDir } = model;
  const { packageDetails } = model.options;
  const filePath = joinPaths(rlcSourceDir!, `logger.ts`);
  const loggerFile = project.createSourceFile("logger.ts", undefined, {
    overwrite: true,
  });
  loggerFile.addImportDeclaration({
    namedImports: ["createClientLogger"],
    moduleSpecifier: `@azure/logger`,
  });
  loggerFile.addStatements(
    `export const logger = createClientLogger("${
      packageDetails!.nameWithoutScope ?? packageDetails?.name ?? ""
    }")`,
  );
  return { path: filePath, content: loggerFile.getFullText() };
}
