/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as go from "../../codemodel/index.js";
import { fixUpMethodName } from "./operations.js";

/** the shape of the apiview-properties.json file */
interface ApiViewProperties {
  CrossLanguagePackageId: string;
  CrossLanguageDefinitionId: Record<string, string>;
  CrossLanguageVersion: string;
}

/**
 * creates the content in apiview-properties.json. the file maps the line IDs
 * emitted by the Go APIView parser to their tcgc cross-language definition IDs
 * so that APIView can link the Go API surface to the other languages.
 *
 * @param codeModel the code model for which to generate the mapping
 * @param containingModuleRelativePackagePath the emitted package's path relative to its containing module root
 * @returns the JSON content or the empty string when there's nothing to emit
 */
export function generateApiViewProperties(
  codeModel: go.CodeModel,
  containingModuleRelativePackagePath?: string,
): string {
  const rootPkg =
    codeModel.root.kind === "module" ? codeModel.root : codeModel.root.package;

  const definitionIDs = new Map<string, string>();
  collectPackage(
    rootPkg,
    relPackageName(rootPkg, containingModuleRelativePackagePath),
    codeModel.type,
    codeModel.info.title,
    definitionIDs,
  );

  if (definitionIDs.size === 0) {
    return "";
  }

  const properties: ApiViewProperties = {
    CrossLanguagePackageId: codeModel.info.title,
    CrossLanguageDefinitionId: Object.fromEntries(
      Array.from(definitionIDs.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
    CrossLanguageVersion: codeModel.info.crossLanguageVersion,
  };

  return JSON.stringify(properties, null, 2) + "\n";
}

/**
 * returns the package path relative to its module root, which is how the Go
 * APIView parser qualifies every line ID. e.g. azblob or azblob/blob
 *
 * @param pkg the package for which to compute the name
 * @param containingModuleRelativePackagePath the emitted package's path relative to its containing module root
 * @returns the module-relative package path
 */
function relPackageName(
  pkg: go.PackageContent,
  containingModuleRelativePackagePath?: string,
): string {
  if (pkg.kind === "module") {
    return go.getPackageName(pkg);
  }
  const parent = pkg.parent;
  if (parent.kind === "containingModule") {
    const moduleName = path.basename(parent.identity.replace(/\/v\d+$/, ""));
    const packagePath = containingModuleRelativePackagePath ?? pkg.name;
    return packagePath ? `${moduleName}/${packagePath}` : moduleName;
  }
  const parentName = relPackageName(parent, containingModuleRelativePackagePath);
  return `${parentName}/${pkg.name}`;
}

/**
 * recursively collects the line ID to cross-language definition ID mappings for a package.
 *
 * @param pkg the package to collect
 * @param relName the package name relative to the module root (e.g. azblob/blob)
 * @param target the codegen target for the package
 * @param crossLanguagePackageId the package's cross-language definition ID
 * @param definitionIDs receives the collected mappings
 */
function collectPackage(
  pkg: go.PackageContent,
  relName: string,
  target: go.CodeModelType,
  crossLanguagePackageId: string,
  definitionIDs: Map<string, string>,
): void {
  // APIView only reviews the exported API surface
  const addType = (name: string, crossLanguageDefinitionId?: string): void => {
    if (crossLanguageDefinitionId && isExported(name)) {
      definitionIDs.set(`${relName}.${name}`, crossLanguageDefinitionId);
    }
  };
  const addFunc = (sig: string, name: string, crossLanguageDefinitionId?: string): void => {
    if (crossLanguageDefinitionId && isExported(name)) {
      definitionIDs.set(`${relName}-${sig}`, crossLanguageDefinitionId);
    }
  };

  for (const model of pkg.models) {
    addType(model.name, model.crossLanguageDefinitionId);
  }

  for (const constant of pkg.constants) {
    addType(constant.name, constant.crossLanguageDefinitionId);
    for (const value of constant.values) {
      addType(value.name, value.crossLanguageDefinitionId);
    }
  }

  if (target === "azure-arm" && pkg.clients.length > 0) {
    addType("ClientFactory", crossLanguagePackageId);
    addFunc("NewClientFactory", "NewClientFactory", crossLanguagePackageId);
  }

  for (const client of pkg.clients) {
    addType(client.name, client.crossLanguageDefinitionId);

    if (client.instance?.kind === "constructable") {
      for (const ctor of client.instance.constructors) {
        addFunc(ctor.name, ctor.name, client.crossLanguageDefinitionId);
      }
    }

    if (target === "azure-arm") {
      // ARM clients are also created from the ClientFactory
      const ctorName = `New${client.name}`;
      addFunc(`(c *ClientFactory) ${ctorName}`, ctorName, client.crossLanguageDefinitionId);
    }

    for (const method of client.methods) {
      const methodName = fixUpMethodName(method);
      const receiver = method.receiver;
      addFunc(
        `(${receiver.name} ${receiver.byValue ? "" : "*"}${receiver.type.name}) ${methodName}`,
        methodName,
        method.crossLanguageDefinitionId,
      );
    }
  }

  for (const subPkg of pkg.packages) {
    collectPackage(
      subPkg,
      `${relName}/${subPkg.name}`,
      target,
      crossLanguagePackageId,
      definitionIDs,
    );
  }
}

function isExported(name: string): boolean {
  return name.length > 0 && name[0] === name[0].toUpperCase();
}
