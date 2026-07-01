import { SourceFile } from "ts-morph";
import { ImportType, Imports } from "../interfaces.js";

/**
 * Build the common imports for generated SDK. Azure Core packages are always used.
 * @returns
 */
export function buildRuntimeImports(): Imports {
  return {
    restClient: {
      type: "restClient",
      specifier: "@azure-rest/core-client",
      version: "^2.0.0",
    },
    coreAuth: {
      type: "coreAuth",
      specifier: "@azure/core-auth",
      version: "^1.6.0",
    },
    restPipeline: {
      type: "restPipeline",
      specifier: "@azure/core-rest-pipeline",
      version: "^1.14.0",
    },
    coreUtil: {
      type: "coreUtil",
      specifier: "@azure/core-util",
      version: "^1.4.0",
    },
    coreLogger: {
      type: "coreLogger",
      specifier: "@azure/logger",
      version: "^1.0.4",
    },
    azureEslintPlugin: {
      type: "azureEslintPlugin",
      specifier: "@azure/eslint-plugin-azure-sdk",
      version: "^3.0.0",
    },
    azureTestRecorder: {
      type: "azureTestRecorder",
      specifier: "@azure-tools/test-recorder",
      version: "^3.0.0",
    },
    azureCoreLro: {
      type: "azureCoreLro",
      specifier: "@azure/core-lro",
    },
  } as Imports;
}

/**
 * Initialize the inner imports for parameter and response, the import set would be used for referred models
 * @returns
 */
export function initInternalImports(): Imports {
  return {
    parameter: {
      type: "parameter",
      importsSet: new Set<string>(),
    },
    response: {
      type: "response",
      importsSet: new Set<string>(),
    },
    index: {
      type: "index",
      importsSet: new Set<string>(),
    },
    modularModel: {
      type: "modularModel",
      importsSet: new Set<string>(),
    },
    clientFactory: {
      type: "clientFactory",
      importsSet: new Set<string>(),
    },
    clientDefinition: {
      type: "clientDefinition",
      importsSet: new Set<string>(),
    },
    serializerHelpers: {
      type: "serializerHelpers",
      importsSet: new Set<string>(),
    },
  } as Imports;
}

export function getImportSpecifier(
  importType: ImportType,
  imports?: Imports,
  includeFallback = true,
): string {
  imports = imports ?? ({} as Imports);
  const defaultPackageMap: Record<ImportType, string> = {
    restClient: "@azure-rest/core-client",
    coreAuth: "@azure/core-auth",
    restPipeline: "@azure/core-rest-pipeline",
    coreUtil: "@azure/core-util",
    coreLogger: "@azure/logger",
    azureCoreLro: "@azure/core-lro",
  } as any;
  if (!includeFallback) {
    return imports[importType]?.specifier ?? "";
  }
  return (
    (imports[importType] ?? imports.commonFallback)?.specifier ??
    defaultPackageMap[importType] ??
    ""
  );
}

export function addImportToSpecifier(
  importType: ImportType,
  runtimeImports: Imports,
  importedName: string,
): void {
  const specifier = getImportSpecifier(importType, runtimeImports);
  const importSet = runtimeImports[importType]?.importsSet;
  if (!importSet) {
    runtimeImports[importType] = {
      type: importType,
      specifier,
      importsSet: new Set<string>().add(importedName),
    };
  } else {
    importSet.add(importedName);
  }
}

export function clearImportSets(runtimeImports: Imports): void {
  for (const importType of Object.values(runtimeImports)) {
    importType.importsSet?.clear();
  }
}

export function addImportsToFiles(
  runtimeImports: Imports,
  file: SourceFile,
  internalSpecifierMap?: Record<string, string>,
): void {
  Object.values(runtimeImports)
    .filter((importType) => {
      return importType.importsSet?.size;
    })
    .forEach((importType) => {
      const specifier = internalSpecifierMap?.[importType.type] ?? importType.specifier!;
      let hasModifier = false;
      if (!specifier) {
        return;
      }
      file
        .getImportDeclarations()
        .filter((importDeclaration) => {
          return importDeclaration.getModuleSpecifierValue() === specifier;
        })
        .forEach((importDeclaration) => {
          hasModifier = true;
          importDeclaration.addNamedImports([...importType.importsSet!.values()]);
        });

      if (!hasModifier) {
        file.addImportDeclaration({
          isTypeOnly: true,
          moduleSpecifier: specifier,
          namedImports: [...importType.importsSet!.values()],
        });
        return;
      }
    });
  clearImportSets(runtimeImports);
}
