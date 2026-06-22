// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { joinPaths } from "@typespec/compiler";
import { Project, SourceFile } from "ts-morph";
import { NameType, normalizeName } from "./helpers/name-utils.js";
import {
  hasCsvCollection,
  hasInputModels,
  hasMultiCollection,
  hasOutputModels,
  hasPagingOperations,
  hasPipeCollection,
  hasPollingOperations,
  hasSsvCollection,
  hasTsvCollection,
  hasUnexpectedHelper,
} from "./helpers/operation-helpers.js";
import { RLCModel } from "./interfaces.js";

export function buildIndexFile(model: RLCModel) {
  const multiClient = Boolean(model.options?.multiClient),
    batch = model.options?.batch;
  const project = new Project({ useInMemoryFileSystem: true });
  const { srcPath } = model;
  const filePath = joinPaths(srcPath, `index.ts`);
  const indexFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  if (!multiClient || !batch || batch?.length === 1) {
    // if we are generate single client package for RLC
    generateRLCIndex(indexFile, model);
  } else {
    generateRLCIndexForMultiClient(indexFile, model);
  }
  return {
    path: filePath,
    content: indexFile.getFullText(),
  };
}

// to generate a index.ts for each single module inside the multi client RLC package
function generateRLCIndexForMultiClient(file: SourceFile, model: RLCModel) {
  const clientName = model.libraryName;
  const createClientFuncName = `createClient`;
  const moduleName = normalizeName(clientName, NameType.File);

  file.addImportDeclaration({
    namespaceImport: "Parameters",
    moduleSpecifier: "./parameters.js",
  });

  file.addImportDeclaration({
    namespaceImport: "Responses",
    moduleSpecifier: "./responses.js",
  });

  file.addImportDeclaration({
    namespaceImport: "Client",
    moduleSpecifier: "./clientDefinitions.js",
  });

  const exports = ["Parameters", "Responses", "Client"];
  if (hasInputModels(model)) {
    file.addImportDeclaration({
      namespaceImport: "Models",
      moduleSpecifier: "./models.js",
    });
    exports.push("Models");
  }

  if (hasOutputModels(model)) {
    file.addImportDeclaration({
      namespaceImport: "OutputModels",
      moduleSpecifier: "./outputModels.js",
    });
    exports.push("OutputModels");
  }

  if (hasPagingOperations(model)) {
    file.addImportDeclaration({
      namespaceImport: "PaginateHelper",
      moduleSpecifier: "./paginateHelper.js",
    });
    exports.push("PaginateHelper");
  }

  if (hasUnexpectedHelper(model)) {
    file.addImportDeclaration({
      namespaceImport: "UnexpectedHelper",
      moduleSpecifier: "./isUnexpected.js",
    });
    exports.push("UnexpectedHelper");
  }

  if (hasPollingOperations(model)) {
    file.addImportDeclaration({
      namespaceImport: "PollingHelper",
      moduleSpecifier: "./pollingHelper.js",
    });
    exports.push("PollingHelper");
  }

  if (
    hasMultiCollection(model) ||
    hasSsvCollection(model) ||
    hasPipeCollection(model) ||
    hasTsvCollection(model) ||
    hasCsvCollection(model)
  ) {
    file.addImportDeclaration({
      namespaceImport: "SerializeHelper",
      moduleSpecifier: "./serializeHelper.js",
    });
    exports.push("SerializeHelper");
  }

  file.addExportDeclarations([
    {
      moduleSpecifier: `./${moduleName}.js`,
      namedExports: [`${createClientFuncName}`, `${clientName}ClientOptions`],
    },
    {
      namedExports: [...exports],
    },
  ]);
}

function generateRLCIndex(file: SourceFile, model: RLCModel) {
  const clientName = model.libraryName;
  const createClientFuncName = `${clientName}`;
  const moduleName = normalizeName(clientName, NameType.File);

  file.addImportDeclaration({
    moduleSpecifier: `./${moduleName}.js`,
    defaultImport: createClientFuncName,
  });

  file.addExportDeclarations([
    {
      moduleSpecifier: `./${moduleName}.js`,
    },
    {
      moduleSpecifier: `./parameters.js`,
    },
    {
      moduleSpecifier: `./responses.js`,
    },
    {
      moduleSpecifier: `./clientDefinitions.js`,
    },
  ]);

  if (hasUnexpectedHelper(model)) {
    file.addExportDeclarations([
      {
        moduleSpecifier: `./isUnexpected.js`,
      },
    ]);
  }

  if (hasInputModels(model)) {
    file.addExportDeclarations([
      {
        moduleSpecifier: `./models.js`,
      },
    ]);
  }

  if (hasOutputModels(model)) {
    file.addExportDeclarations([
      {
        moduleSpecifier: `./outputModels.js`,
      },
    ]);
  }

  if (hasPagingOperations(model)) {
    file.addExportDeclarations([
      {
        moduleSpecifier: `./paginateHelper.js`,
      },
    ]);
  }

  if (hasPollingOperations(model)) {
    file.addExportDeclarations([
      {
        moduleSpecifier: `./pollingHelper.js`,
      },
    ]);
  }

  if (
    hasMultiCollection(model) ||
    hasSsvCollection(model) ||
    hasPipeCollection(model) ||
    hasTsvCollection(model) ||
    hasCsvCollection(model)
  ) {
    file.addExportDeclarations([
      {
        moduleSpecifier: `./serializeHelper.js`,
      },
    ]);
  }

  file.addExportDeclarations([
    {
      moduleSpecifier: "@azure/core-rest-pipeline",
      namedExports: ["RestError", "isRestError"],
    },
  ]);

  file.addExportAssignment({
    expression: createClientFuncName,
    isExportEquals: false,
  });
}
