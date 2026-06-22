// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from "path";
import { Project } from "ts-morph";
import {
  buildObjectAliases,
  buildObjectInterfaces,
  buildPolymorphicAliases,
} from "./build-object-types.js";
import { getImportSpecifier } from "./helpers/imports-util.js";
import { getImportModuleName } from "./helpers/name-constructors.js";
import { RLCModel, SchemaContext } from "./interfaces.js";

/**
 * Generates types to represent schema definitions in the swagger
 */
export function buildSchemaTypes(model: RLCModel) {
  const { srcPath } = model;
  const project = new Project();
  let filePath = path.join(srcPath, `models.ts`);
  const inputModelFile = generateModelFiles(model, project, filePath, [SchemaContext.Input]);
  filePath = path.join(srcPath, `outputModels.ts`);
  const outputModelFile = generateModelFiles(model, project, filePath, [
    SchemaContext.Output,
    SchemaContext.Exception,
  ]);
  return { inputModelFile, outputModelFile };
}

export function generateModelFiles(
  model: RLCModel,
  project: Project,
  filePath: string,
  schemaContext: SchemaContext[],
) {
  // Track models that need to be imported
  const importedModels = new Set<string>();
  const objectsDefinitions = buildObjectInterfaces(model, importedModels, schemaContext);

  const objectTypeAliases = buildPolymorphicAliases(model, schemaContext);

  const objectAliases = buildObjectAliases(model, importedModels, schemaContext);

  if (objectTypeAliases.length || objectsDefinitions.length || objectAliases.length) {
    const modelsFile = project.createSourceFile(filePath, undefined, {
      overwrite: true,
    });

    modelsFile.addInterfaces(objectsDefinitions);
    modelsFile.addTypeAliases(objectTypeAliases);
    modelsFile.addTypeAliases(objectAliases);
    if (importedModels.size > 0) {
      modelsFile.addImportDeclarations([
        {
          isTypeOnly: true,
          namedImports: [...Array.from(importedModels || [])],
          moduleSpecifier: getImportSpecifier("restClient", model.importInfo.runtimeImports),
        },
      ]);
    }
    // Add NodeReadableStream import if binary types are used in models.
    // platform-types.ts is generated directly under src/ (no static-helpers/
    // subdirectory) to match the RLC design where all output lives in src/.
    // The platform-types static helper resolves NodeReadableStream to
    // NodeJS.ReadableStream on Node and `never` on browser/react-native, so the
    // union arm drops out naturally in non-Node builds.
    if (modelsFile.getFullText().includes("NodeReadableStream")) {
      const platformTypesModuleSpecifier = model.options?.azureSdkForJs
        ? "@azure/core-rest-pipeline"
        : getImportModuleName(
            {
              cjsName: `./platform-types`,
              esModulesName: `./platform-types.js`,
            },
            model,
          );
      modelsFile.addImportDeclarations([
        {
          isTypeOnly: true,
          namedImports: ["NodeReadableStream"],
          moduleSpecifier: platformTypesModuleSpecifier,
        },
      ]);
    }
    return { path: filePath, content: modelsFile.getFullText() };
  }
  return undefined;
}
