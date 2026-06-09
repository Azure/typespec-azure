import { normalizePath, NoTarget, Program } from "@typespec/compiler";
import { readdir, readFile, stat } from "fs/promises";
import * as path from "path";
import {
  ClassDeclaration,
  EnumDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  Project,
  SourceFile,
  TypeAliasDeclaration,
} from "ts-morph";
import { reportDiagnostic } from "../lib.js";
import { ModularEmitterOptions } from "../modular/interfaces.js";
import { isAzurePackage } from "../rlc-common/index.js";
import { resolveProjectRoot } from "../utils/resolve-project-root.js";
import { refkey } from "./refkey.js";
export const SourceFileSymbol = Symbol("SourceFile");

/**
 * Computes the `#platform/<path>` subpath import specifier for a file, where the
 * path is relative to the package `src` directory (since `#platform/*` maps to
 * `./src/*` in the generated package.json).
 *
 * The package `src` directory is derived from the actual `sourceRoot` (which may
 * be e.g. `.../src`, `.../src/generated` or `.../generated`) by locating its
 * trailing `src` path segment, instead of assuming a hardcoded `/src/` segment.
 * Returns `undefined` when no `src` segment can be found and no fallback applies.
 */
export function getPlatformSubpathSpecifier(
  filePath: string,
  sourceRoot: string,
): string | undefined {
  const normalizedFile = normalizePath(filePath);
  const normalizedRoot = normalizePath(sourceRoot).replace(/\/+$/, "");

  // Primary: when sourceRoot has a "src" segment and the file is located under it
  if (normalizedRoot) {
    const rootSegments = normalizedRoot.split("/");
    const srcSegmentIndex = rootSegments.lastIndexOf("src");
    if (srcSegmentIndex !== -1) {
      const srcDir = rootSegments.slice(0, srcSegmentIndex + 1).join("/");
      if (normalizedFile.startsWith(`${srcDir}/`)) {
        const relativePath = normalizedFile.substring(srcDir.length + 1);
        return `#platform/${relativePath.replace(/\.[cm]?[jt]s$/, "")}`;
      }
    }
  }

  // Fallback: search for a /src/ segment anywhere in the file path
  // (handles cases where filePath is absolute but sourceRoot is a different absolute path,
  //  e.g. in tests where sourceRoot is a mock path like "/modularPackageFolder/src",
  //  and in production where both paths share the same /src/ directory ancestry)
  const srcIndex = normalizedFile.indexOf("/src/");
  if (srcIndex !== -1) {
    const relativePath = normalizedFile.substring(srcIndex + "/src/".length);
    return `#platform/${relativePath.replace(/\.[cm]?[jt]s$/, "")}`;
  }

  // Final fallback: relative paths without a /src/ segment (e.g., when sourceRoot is empty)
  if (!normalizedFile.startsWith("/")) {
    return `#platform/${normalizedFile.replace(/\.[cm]?[jt]s$/, "")}`;
  }

  return undefined;
}

export interface StaticHelperMetadata {
  name: string;
  kind: "function" | "interface" | "typeAlias" | "class" | "enum";
  location: string;
  [SourceFileSymbol]?: SourceFile;
}

export function isStaticHelperMetadata(metadata: any): metadata is StaticHelperMetadata {
  return Boolean(
    metadata && metadata.name && metadata.kind && metadata.location && metadata[SourceFileSymbol],
  );
}

export type StaticHelpers = Record<string, StaticHelperMetadata>;

const DEFAULT_SOURCES_STATIC_HELPERS_PATH = "static/static-helpers";
const DEFAULT_SOURCES_TESTING_HELPERS_PATH = "static/test-helpers";

export interface LoadStaticHelpersOptions extends Partial<ModularEmitterOptions> {
  helpersAssetDirectory?: string;
  sourcesDir?: string;
  rootDir?: string;
  program?: Program;
  /** When true, also load test helpers from static/test-helpers/ into test/generated/util/ */
  loadTestHelpers?: boolean;
}

interface FileMetadata {
  source: string;
  target: string;
}

export async function loadStaticHelpers(
  project: Project,
  helpers: StaticHelpers,
  options: LoadStaticHelpersOptions = {},
): Promise<Map<string, StaticHelperMetadata>> {
  const helpersMap = new Map<string, StaticHelperMetadata>();
  // Load static helpers used in sources code
  const defaultStaticHelpersPath = path.join(
    resolveProjectRoot(),
    DEFAULT_SOURCES_STATIC_HELPERS_PATH,
  );
  const filesInSources = await traverseDirectory(
    options.helpersAssetDirectory ?? defaultStaticHelpersPath,
    options.program,
  );
  await loadFiles(filesInSources, options.sourcesDir ?? "");
  // Load static helpers used in testing code (only when loadTestHelpers is enabled)
  if (
    options.loadTestHelpers ??
    (options.options?.generateTest && isAzurePackage({ options: options.options }))
  ) {
    const defaultTestingHelpersPath = path.join(
      resolveProjectRoot(),
      DEFAULT_SOURCES_TESTING_HELPERS_PATH,
    );
    const filesInTestings = await traverseDirectory(
      defaultTestingHelpersPath,
      options.program,
      [],
      "",
      "test/generated/util",
    );
    await loadFiles(filesInTestings, options.rootDir ?? "");
  }
  return assertAllHelpersLoadedPresent(helpersMap);

  async function loadFiles(files: FileMetadata[], generateDir: string) {
    const sourcePaths = new Set(files.map((f) => normalizePath(f.source)));
    for (const file of files) {
      const targetPath = path.join(generateDir, file.target);
      const contents = await readFile(file.source, "utf-8");
      const addedFile = project.createSourceFile(targetPath, contents, {
        overwrite: true,
      });
      // A file with its own platform variant (a sibling -browser.mts /
      // -react-native.mts) is resolved as a whole via #platform, so its
      // internal relative platform-types imports must be kept relative.
      const sourceBase = normalizePath(file.source).replace(/\.[cm]?ts$/, "");
      const hasPlatformVariant =
        sourcePaths.has(`${sourceBase}-browser.mts`) ||
        sourcePaths.has(`${sourceBase}-react-native.mts`);
      addedFile.getImportDeclarations().map((i) => {
        if (!isAzurePackage({ options: options.options })) {
          if (i.getModuleSpecifier().getFullText().includes("@azure/core-rest-pipeline")) {
            i.setModuleSpecifier("@typespec/ts-http-runtime");
          }
          if (i.getModuleSpecifier().getFullText().includes("@azure-rest/core-client")) {
            i.setModuleSpecifier("@typespec/ts-http-runtime");
          }
        }
        // Rewrite relative platform-types imports to #platform/ specifiers
        // so that browser/react-native variants are resolved via subpath imports.
        // Only rewrite imports to the default variant (not -browser/-react-native variants
        // which are already platform-specific direct imports), and only when the
        // current file does not itself have a platform variant.
        if (options.options?.azureSdkForJs && !hasPlatformVariant) {
          const specifier = i.getModuleSpecifierValue();
          if (
            specifier.startsWith(".") &&
            specifier.includes("platform-types") &&
            !specifier.includes("-browser") &&
            !specifier.includes("-react-native")
          ) {
            // Resolve the relative import specifier against the target file's directory
            // (using posix path operations since normalizePath returns forward-slash paths)
            // to get the normalized path of the platform-types file, then compute
            // its #platform/ subpath specifier relative to generateDir.
            const platformTypesPath = path.posix.normalize(
              path.posix.join(path.posix.dirname(normalizePath(targetPath)), specifier),
            );
            const platformSpecifier = getPlatformSubpathSpecifier(platformTypesPath, generateDir);
            if (platformSpecifier) {
              i.setModuleSpecifier(platformSpecifier);
            }
          }
        }
      });

      for (const entry of Object.values(helpers)) {
        if (!addedFile.getFilePath().endsWith(entry.location)) {
          continue;
        }

        const declaration = getDeclarationByMetadata(addedFile, entry);
        if (!declaration) {
          throw new Error(
            `Declaration ${
              entry.name
            } not found in file ${addedFile.getFilePath()}\n This is an Emitter bug, make sure that the map of static helpers passed to loadStaticHelpers matches what is in the file.`,
          );
        }

        entry[SourceFileSymbol] = addedFile;
        helpersMap.set(refkey(entry), entry);
      }
    }
  }
}

function assertAllHelpersLoadedPresent(helpers: Map<string, StaticHelperMetadata>) {
  const missingHelpers = [];
  for (const helper of helpers.values()) {
    if (!helper[SourceFileSymbol]) {
      missingHelpers.push(helper);
    }
  }

  if (missingHelpers.length > 0) {
    const missingHelpersString = missingHelpers
      .map((helper) => `${helper.name} - ${helper.location}`)
      .join("\n");

    throw new Error(
      `The following helpers were not found in the project, make sure they are defined in the expected static helper file: ${missingHelpersString}`,
    );
  }

  return helpers;
}

function getDeclarationByMetadata(
  file: SourceFile,
  declaration: StaticHelperMetadata,
):
  | ClassDeclaration
  | FunctionDeclaration
  | TypeAliasDeclaration
  | InterfaceDeclaration
  | EnumDeclaration
  | undefined {
  switch (declaration.kind) {
    case "class":
      return file.getClass(declaration.name);
    case "function":
      return file.getFunction(declaration.name);
    case "interface":
      return file.getInterface(declaration.name);
    case "typeAlias":
      return file.getTypeAlias(declaration.name);
    case "enum":
      return file.getEnum(declaration.name);
    default:
      throw new Error(
        `invalid helper kind ${declaration.kind}\nAll helpers provided to loadStaticHelpers are of kind: function, interface, typeAlias, class`,
      );
  }
}

const _targetStaticHelpersBaseDir = "static-helpers";
async function traverseDirectory(
  directory: string,
  program?: Program,
  result: { source: string; target: string }[] = [],
  relativePath: string = "",
  targetBaseDir: string = _targetStaticHelpersBaseDir,
): Promise<{ source: string; target: string }[]> {
  try {
    const files = await readdir(directory);

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directory, file);
        const fileStat = await stat(filePath);

        if (fileStat.isDirectory()) {
          await traverseDirectory(
            filePath,
            program,
            result,
            path.join(relativePath, file),
            targetBaseDir,
          );
        } else if (fileStat.isFile() && !file.endsWith(".d.ts") && /.*\..?ts$/.test(file)) {
          const target = path.join(targetBaseDir, relativePath, file);
          result.push({ source: filePath, target });
        }
      }),
    );

    return result;
  } catch (error) {
    if (program) {
      reportDiagnostic(program, {
        code: "directory-traversal-error",
        format: { directory, error: String(error) },
        target: NoTarget,
      });
    }
    throw error;
  }
}
